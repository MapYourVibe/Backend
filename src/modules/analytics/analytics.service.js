const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

// In-memory cache for the heavy platform financial aggregate (~60s TTL)
const financialCache = new Map();
const FINANCIAL_CACHE_TTL_MS = 60 * 1000;

/**
 * Aggregates platform-level financials: settled payments, organizer commission
 * (computed from payout bps), processed refunds, and payout distribution by status.
 * Results are cached for 60s because this is a heavy multi-aggregate query.
 */
const getPlatformFinancialOverview = async ({ startDate, endDate } = {}) => {
  const cacheKey = `${startDate ?? ""}|${endDate ?? ""}`;
  const cached = financialCache.get(cacheKey);
  if (cached && Date.now() - cached.at < FINANCIAL_CACHE_TTL_MS) {
    return cached.data;
  }

  const startCondition = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Defaults to past 90 days
  const endCondition = endDate ? new Date(endDate) : new Date();

  const [
    settledPayments,
    processedRefunds,
    payoutGroups,
    paymentGroups,
    orderGroups,
    soldTicketStats,
    capacityStats,
    ticketTypeStats,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        createdAt: { gte: startCondition, lte: endCondition },
      },
      select: { amountInPaise: true },
    }),
    prisma.refund.findMany({
      where: {
        status: "PROCESSED",
        createdAt: { gte: startCondition, lte: endCondition },
      },
      select: { finalRefundAmountInPaise: true },
    }),
    prisma.payout.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startCondition, lte: endCondition } },
      _sum: {
        grossTicketAmountInPaise: true,
        commissionAmountInPaise: true,
        netPayoutInPaise: true,
      },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startCondition, lte: endCondition } },
      _sum: { amountInPaise: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startCondition, lte: endCondition } },
      _sum: { totalInPaise: true },
      _count: { _all: true },
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] },
          createdAt: { gte: startCondition, lte: endCondition },
        },
      },
      _sum: { quantity: true },
    }),
    prisma.capacitySlot.aggregate({
      where: { listing: { status: "PUBLISHED" } },
      _sum: { totalCapacity: true },
    }),
    prisma.ticketType.aggregate({
      where: { listing: { status: "PUBLISHED" } },
      _sum: { totalQuantity: true },
    }),
  ]);

  const grossVolumeInPaise = settledPayments.reduce((sum, p) => sum + p.amountInPaise, 0);
  const refundedInPaise = processedRefunds.reduce(
    (sum, r) => sum + r.finalRefundAmountInPaise,
    0,
  );
  const netVolumeInPaise = Math.max(0, grossVolumeInPaise - refundedInPaise);

  const payoutsByStatus = payoutGroups.map((g) => ({
    status: g.status,
    count: g._count._all,
    grossTicketAmountInPaise: g._sum.grossTicketAmountInPaise || 0,
    commissionAmountInPaise: g._sum.commissionAmountInPaise || 0,
    netPayoutInPaise: g._sum.netPayoutInPaise || 0,
  }));

  const platformCommissionInPaise = payoutGroups.reduce(
    (sum, g) => sum + (g._sum.commissionAmountInPaise || 0),
    0,
  );

  // "Organizers paid out" = net payout already released to organizers
  const organizersPaidOutInPaise = payoutGroups.reduce(
    (sum, g) =>
      sum +
      (g.status === "RELEASED" ? g._sum.netPayoutInPaise || 0 : 0),
    0,
  );

  const paymentByStatus = Object.fromEntries(
    paymentGroups.map((g) => [g.status, g]),
  );

  const settled =
    paymentByStatus.SUCCESS ?? { _count: { _all: 0 }, _sum: { amountInPaise: 0 } };
  const processing =
    paymentByStatus.PENDING ?? { _count: { _all: 0 }, _sum: { amountInPaise: 0 } };

  const orderStatusBreakdown = Object.fromEntries(
    orderGroups.map((g) => [
      g.status,
      { count: g._count._all, totalInPaise: g._sum.totalInPaise || 0 },
    ]),
  );

  const totalOrders = orderGroups.reduce((sum, g) => sum + g._count._all, 0);
  const totalTicketsSold = soldTicketStats._sum.quantity || 0;
  const totalAvailable = (ticketTypeStats._sum.totalQuantity || 0) +
    (capacityStats._sum.totalCapacity || 0);
  const occupancyRate =
    totalAvailable > 0 ? Number(((totalTicketsSold / totalAvailable) * 100).toFixed(2)) : 0;

  const data = {
    period: { startDate: startCondition.toISOString(), endDate: endCondition.toISOString() },
    grossVolumeInPaise,
    refundedInPaise,
    netVolumeInPaise,
    platformCommissionInPaise,
    organizersPaidOutInPaise,
    totalOrders,
    settlementBreakdown: {
      settled: {
        orders: settled._count._all,
        totalInPaise: settled._sum.amountInPaise || 0,
      },
      processing: {
        orders: processing._count._all,
        totalInPaise: processing._sum.amountInPaise || 0,
      },
    },
    orderStatusBreakdown,
    ticketBreakdown: {
      soldCount: totalTicketsSold,
      totalQuantity: totalAvailable,
      occupancyRate,
    },
  };

  financialCache.set(cacheKey, { at: Date.now(), data });
  return data;
};

/**
 * Calculates deep ecosystem revenue trends and transaction distributions across time blocks.
 */
const getGlobalRevenueAnalytics = async ({ startDate, endDate }) => {
  const startCondition = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Defaults to past 30 days
  const endCondition = endDate ? new Date(endDate) : new Date();

  const [settledPayments, activeRefunds] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        createdAt: { gte: startCondition, lte: endCondition },
      },
      select: { amountInPaise: true, currency: true, createdAt: true },
    }),
    prisma.refund.findMany({
      where: {
        status: "PROCESSED",
        createdAt: { gte: startCondition, lte: endCondition },
      },
      select: { finalRefundAmountInPaise: true, createdAt: true },
    }),
  ]);

  const grossVolume = settledPayments.reduce((sum, p) => sum + p.amountInPaise, 0);
  const aggregateRefunded = activeRefunds.reduce((sum, r) => sum + r.finalRefundAmountInPaise, 0);
  const netRevenue = Math.max(0, grossVolume - aggregateRefunded);

  return {
    timeframe: { start: startCondition, end: endCondition },
    aggregates: {
      grossVolumeInPaise: grossVolume,
      totalRefundedInPaise: aggregateRefunded,
      netRevenueInPaise: netRevenue,
      transactionCount: settledPayments.length,
    },
  };
};

/**
 * Aggregates organizer metrics, calculating attendance check-in conversion rates.
 */
const getOrganizerPerformanceAnalytics = async (
  organizerUserId,
  { startDate, endDate, listingId },
) => {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { userId: organizerUserId },
  });
  if (!organizer) throw new AppError("Organizer profile records not found.", 404);

  const startCondition = startDate ? new Date(startDate) : new Date(0); // Epoch baseline fallback
  const endCondition = endDate ? new Date(endDate) : new Date();

  const listingsWhere = {
    organizerId: organizer.id,
    ...(listingId ? { id: listingId } : {}),
    createdAt: { gte: startCondition, lte: endCondition },
  };

  const listings = await prisma.listing.findMany({
    where: listingsWhere,
    include: {
      orders: {
        where: { status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] } },
        include: { tickets: true },
      },
    },
  });

  let aggregateTicketsSold = 0;
  let aggregateCheckedIn = 0;

  for (const event of listings) {
    for (const order of event.orders) {
      aggregateTicketsSold += order.tickets.length;

      const checkInCount = await prisma.checkIn.count({
        where: { ticketId: { in: order.tickets.map((t) => t.id) } },
      });
      aggregateCheckedIn += checkInCount;
    }
  }

  // Attendance Conversion Rate Calculation
  const attendanceRate =
    aggregateTicketsSold > 0
      ? Number(((aggregateCheckedIn / aggregateTicketsSold) * 100).toFixed(2))
      : 0.0;

  return {
    organizerId: organizer.id,
    performanceMetrics: {
      totalEventsAnalyzed: listings.length,
      ticketsSold: aggregateTicketsSold,
      verifiedCheckIns: aggregateCheckedIn,
      attendanceConversionPercentage: attendanceRate,
    },
  };
};

/**
 * Identifies high-velocity event listings based on ticket booking counts.
 * Excludes past events so only upcoming / ongoing listings appear.
 */
const getPopularEventsCatalog = async (limit) => {
  const now = new Date();

  const popularListings = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { eventDate: null },
        { eventDate: { gte: now } },
      ],
    },
    include: {
      ticketTypes: {
        select: {
          name: true,
          priceInPaise: true,
          description: true,
          gstPercent: true,
          gstInclusive: true,
          coverChargeInPaise: true,
          orderItems: {
            where: { order: { status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] } } },
            select: { quantity: true },
          },
        },
      },
      capacitySlots: { select: { bookedCount: true } },
    },
  });

  const catalogWithVelocity = popularListings.map((listing) => {
    const eventSales = listing.ticketTypes.reduce(
      (sum, t) => sum + t.orderItems.reduce((s, oi) => s + oi.quantity, 0),
      0,
    );
    const attractionSales = listing.capacitySlots.reduce((sum, c) => sum + c.bookedCount, 0);

    return {
      id: listing.id,
      title: listing.title,
      listingType: listing.listingType,
      venueName: listing.venueName || "Virtual Space",
      city: listing.city || "Online",
      eventDate: listing.eventDate,
      bannerUrl: listing.bannerUrl,
      galleryUrls: listing.galleryUrls,
      venueBlueprintUrl: listing.venueBlueprintUrl,
      description: listing.description,
      featured: listing.featured,
      ticketTypes: listing.ticketTypes.map((t) => ({
        id: t.name,
        name: t.name,
        description: t.description,
        priceInPaise: t.priceInPaise,
        gstPercent: t.gstPercent,
        gstInclusive: t.gstInclusive,
        coverChargeInPaise: t.coverChargeInPaise,
      })),
      totalTicketsSold: eventSales + attractionSales,
    };
  });

  // Sort descending by highest absolute tickets sold, then take top N
  return catalogWithVelocity
    .sort((a, b) => b.totalTicketsSold - a.totalTicketsSold)
    .slice(0, limit);
};

module.exports = {
  getPlatformFinancialOverview,
  getGlobalRevenueAnalytics,
  getOrganizerPerformanceAnalytics,
  getPopularEventsCatalog,
};
