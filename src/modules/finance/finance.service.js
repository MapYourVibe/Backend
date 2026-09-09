const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

/**
 * Computes the comprehensive real-time financial ledger metrics for a given organizer.
 * Extracts values directly from settled orders and processed refunds.
 */
const getOrganizerLedger = async (organizerId) => {
  // 1. Fetch the organizer profile to access their custom commission rate profile
  const organizer = await prisma.organizerProfile.findUnique({
    where: { id: organizerId },
  });

  if (!organizer) {
    throw new AppError("Organizer profile not found.", 404);
  }

  // 2. Aggregate all confirmed or partially refunded orders matching this organizer's listings
  const orders = await prisma.order.findMany({
    where: {
      listing: { organizerId },
      status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED", "REFUNDED"] },
    },
    include: { items: true },
  });

  // Calculate gross sales values based on successful transactional checkouts
  let grossTicketSales = 0;
  let grossTicketGst = 0;

  for (const order of orders) {
    for (const item of order.items) {
      grossTicketSales += item.priceInPaise * item.quantity;
      grossTicketGst += item.gstAmountInPaise * item.quantity;
    }
  }

  // 3. Aggregate all successfully settled processed refunds
  const processedRefunds = await prisma.refund.findMany({
    where: {
      order: { listing: { organizerId } },
      status: "PROCESSED",
    },
    include: { items: true },
  });

  let totalRefundedBase = 0;
  let totalRefundedGst = 0;
  let totalRefundDeductionsClawback = 0;

  for (const refund of processedRefunds) {
    totalRefundedBase += refund.totalAmountInPaise;
    totalRefundedGst += refund.gstReversedInPaise;

    // Accumulate the platform's retained refund fee deductions
    const deductionSum = refund.items.reduce((sum, item) => sum + item.deductionInPaise, 0);
    totalRefundDeductionsClawback += deductionSum;
  }

  // 4. Extract active platform parameter settings configurations
  const platformSettings = await prisma.platformSettings.findFirst();
  if (!platformSettings) {
    throw new AppError("Global platform configurations are missing.", 500);
  }

  // Calculate effective balances (Gross sales minus actual customers refunds)
  const netSettleableBase = Math.max(0, grossTicketSales - totalRefundedBase);
  const netSettleableGst = Math.max(0, grossTicketGst - totalRefundedGst);

  // Platform Commission computation (commissionRate stored in basis points, e.g., 1000 = 10%)
  const commissionRateBps = organizer.commissionRate ?? 1000;
  const rawCommissionAmount = Math.round((netSettleableBase * commissionRateBps) / 10000);

  // TCS calculation based on platform settings percentage parameters
  const tcsPercent = Number(platformSettings.tcsPercent ?? 1.0);
  const tcsDeductedAmount = Math.round((netSettleableBase * tcsPercent) / 100);

  // Calculate aggregate net earnings ready for payout settlements
  const netEarnings =
    netSettleableBase + netSettleableGst - rawCommissionAmount - tcsDeductedAmount;

  // 5. Compute total payouts that have already been cleared or are pending release
  const payoutsSummary = await prisma.payout.aggregate({
    where: { organizerId },
    _sum: {
      netPayoutInPaise: true,
    },
  });

  const totalPaidOut = payoutsSummary._sum.netPayoutInPaise ?? 0;
  const settleableBalance = Math.max(0, netEarnings - totalPaidOut);

  return {
    organizerId,
    businessName: organizer.businessName,
    commissionRateBps,
    metrics: {
      grossTicketSalesInPaise: grossTicketSales,
      grossTicketGstInPaise: grossTicketGst,
      totalRefundedBaseInPaise: totalRefundedBase,
      totalRefundedGstInPaise: totalRefundedGst,
      totalRefundDeductionsRetainedInPaise: totalRefundDeductionsClawback,
      netSettleableBaseInPaise: netSettleableBase,
      netSettleableGstInPaise: netSettleableGst,
      calculatedCommissionInPaise: rawCommissionAmount,
      tcsDeductedInPaise: tcsDeductedAmount,
      totalNetEarningsInPaise: netEarnings,
      totalPaidOutInPaise: totalPaidOut,
      currentSettleableBalanceInPaise: settleableBalance,
    },
  };
};

/**
 * Evaluates pending parameters and creates a structured payout request.
 */
const initiatePayout = async ({ organizerId, requestedAmountInPaise }) => {
  const ledger = await getOrganizerLedger(organizerId);
  const availableBalance = ledger.metrics.currentSettleableBalanceInPaise;

  if (requestedAmountInPaise <= 0) {
    throw new AppError("Payout generation requests must exceed zero paise.", 400);
  }

  if (requestedAmountInPaise > availableBalance) {
    throw new AppError(
      `Insufficient ledger balance. Maximum structural payout limit currently: ₹${(availableBalance / 100).toFixed(2)}`,
      400,
    );
  }

  // Calculate proportional financial snapshot line items for the specific payout execution block
  const netEarningsTotal = ledger.metrics.totalNetEarningsInPaise || 1;
  const proportionalRatio = requestedAmountInPaise / netEarningsTotal;

  const proportionalGross = Math.round(ledger.metrics.netSettleableBaseInPaise * proportionalRatio);
  const proportionalCommission = Math.round(
    ledger.metrics.calculatedCommissionInPaise * proportionalRatio,
  );
  const proportionalTcs = Math.round(ledger.metrics.tcsDeductedInPaise * proportionalRatio);

  const payout = await prisma.payout.create({
    data: {
      organizerId,
      grossTicketAmountInPaise: proportionalGross,
      commissionPercent: ledger.commissionRateBps / 100,
      commissionAmountInPaise: proportionalCommission,
      gstOnCommissionInPaise: 0, // Set as a baseline placeholder for explicit dynamic tax additions if required
      tcsDeductedInPaise: proportionalTcs,
      netPayoutInPaise: requestedAmountInPaise,
      status: "PENDING",
    },
  });

  return payout;
};

/**
 * Admin override tool to resolve payout states.
 */
const updatePayoutStatus = async (payoutId, status) => {
  const validStatuses = ["PENDING", "PROCESSING", "RELEASED", "FAILED"];
  if (!validStatuses.includes(status)) {
    throw new AppError("Invalid operational payout status constraint.", 400);
  }

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) {
    throw new AppError("Payout target tracking record not found.", 404);
  }

  const updatedPayout = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status,
      ...(status === "RELEASED" ? { releasedAt: new Date() } : {}),
    },
  });

  return updatedPayout;
};

/**
 * Pulls structural payout execution logs.
 */
const getPayoutHistory = async (organizerId) => {
  return prisma.payout.findMany({
    where: { organizerId },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  getOrganizerLedger,
  initiatePayout,
  updatePayoutStatus,
  getPayoutHistory,
};
