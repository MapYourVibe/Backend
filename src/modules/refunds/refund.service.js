const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");
const refundGateway = require("../payments/gateways/refund.gateway");

/**
 * Maps Razorpay refund status strings to the internal database RefundStatus enum.
 *
 * @param {string} gatewayStatus - Raw status string from Razorpay payload
 * @returns {string} Mapped internal status enum value
 */
const mapGatewayStatus = (gatewayStatus) => {
  switch (gatewayStatus) {
    case "processed":
      return "PROCESSED";
    case "failed":
      return "FAILED";
    case "pending":
    default:
      return "PROCESSING";
  }
};

const createRefund = async ({ userId, ticketIds, reason }) => {
  // 1. Fetch requested tickets along with their associated order, payment, and listing details
  const tickets = await prisma.ticket.findMany({
    where: {
      id: {
        in: ticketIds,
      },
    },
    include: {
      order: {
        include: {
          payment: true,
          tickets: {
            select: {
              id: true,
            },
          },
        },
      },
      orderItem: {
        include: {
          ticketType: {
            select: {
              listing: true,
            },
          },
          capacitySlot: {
            select: {
              listing: true,
            },
          },
        },
      },
    },
  });

  // 2. Validate ticket existence
  if (tickets.length !== ticketIds.length) {
    throw new AppError("One or more tickets were not found.", 404);
  }

  // 3. All tickets must belong to the same order
  const orderId = tickets[0].orderId;
  const sameOrder = tickets.every((ticket) => ticket.orderId === orderId);

  if (!sameOrder) {
    throw new AppError("Selected tickets must belong to the same order.", 400);
  }

  // 4. User must own the order
  if (tickets[0].order.userId !== userId) {
    throw new AppError("You are not allowed to refund these tickets.", 403);
  }

  // 5. Payment verification safeguards
  if (!tickets[0].order.payment) {
    throw new AppError("Payment not found for this order.", 400);
  }

  // Only allow refunds if the customer's payment status is explicitly SUCCESS
  if (tickets[0].order.payment.status !== "SUCCESS") {
    throw new AppError("Only successful payments can be processed for refunds.", 400);
  }

  if (!tickets[0].order.payment.gatewayPaymentId) {
    throw new AppError("Gateway payment ID not found.", 400);
  }

  // Verify order is in a refundable state (e.g., CONFIRMED) before moving forward
  if (tickets[0].order.status !== "CONFIRMED" && tickets[0].order.status !== "PARTIALLY_REFUNDED") {
    throw new AppError("This order is not in a refundable state.", 400);
  }

  // 6. Listing validation
  const listing =
    tickets[0].orderItem.ticketType?.listing ?? tickets[0].orderItem.capacitySlot?.listing;
  if (!listing) {
    throw new AppError("Listing not found.", 404);
  }

  // Event/Attraction listing check
  if (!listing.eventDate && !tickets[0].orderItem.capacitySlotId) {
    throw new AppError("Refund is only supported for valid event or attraction listings.", 400);
  }

  // 7. Partial refund validation
  if (!listing.allowPartialRefunds && tickets.length !== tickets[0].order.tickets.length) {
    throw new AppError("Partial refunds are not allowed for this event.", 400);
  }

  // 8. Validate every individual ticket state and check refund window deadliness
  for (const ticket of tickets) {
    if (ticket.status !== "ACTIVE") {
      throw new AppError(`Ticket ${ticket.ticketNumber} cannot be refunded.`, 400);
    }

    // ✅ Item Idempotency Check: Defensive scan to block tickets already trapped in processing flows
    const overlappingHold = await prisma.refundItem.findFirst({
      where: {
        ticketId: ticket.id,
        refund: {
          status: { in: ["INITIATED", "PROCESSING", "PROCESSED"] },
        },
      },
    });

    if (overlappingHold) {
      throw new AppError(
        `Ticket ${ticket.ticketNumber} is already processing another refund request.`,
        409,
      );
    }

    // Only apply deadliness window bounds checks if dealing with a fixed Event date configuration
    if (listing.eventDate) {
      const refundDeadline = new Date(listing.eventDate);
      const daysAllowed = listing.refundAllowedUntilDays ?? 0;

      refundDeadline.setDate(refundDeadline.getDate() - daysAllowed);

      if (new Date() > refundDeadline) {
        throw new AppError(`Refund window has expired for ticket ${ticket.ticketNumber}.`, 400);
      }
    }
  }

  // 9. Calculate refund amounts
  let totalTicketAmount = 0;
  let totalGstAmount = 0;

  for (const ticket of tickets) {
    totalTicketAmount += ticket.orderItem.priceInPaise;
    totalGstAmount += ticket.orderItem.gstAmountInPaise;
  }

  // 10. Platform settings breakdown
  const platformSettings = await prisma.platformSettings.findFirst();
  if (!platformSettings) {
    throw new AppError("Platform settings not configured.", 500);
  }

  const deductionPercent = Number(platformSettings.refundDeductionPercent);

  const deductionAmount = Math.round((totalTicketAmount * deductionPercent) / 100);

  const finalRefundAmount = totalTicketAmount + totalGstAmount - deductionAmount;

  // ✅ Cumulative Balance Ledger Check: Enforces sum(all refunds) <= original amount paid
  const pastRefunds = await prisma.refund.findMany({
    where: {
      orderId,
      status: { in: ["INITIATED", "PROCESSING", "PROCESSED"] },
    },
    select: {
      finalRefundAmountInPaise: true,
    },
  });

  const cumulativeAmountRefunded = pastRefunds.reduce(
    (sum, r) => sum + r.finalRefundAmountInPaise,
    0,
  );
  const allowedRefundCapacity = tickets[0].order.payment.amountInPaise - cumulativeAmountRefunded;

  if (finalRefundAmount > allowedRefundCapacity) {
    throw new AppError(
      `Refund allocation request exceeds total refundable balance. Available remaining balance: ₹${(allowedRefundCapacity / 100).toFixed(2)}`,
      400,
    );
  }

  // Secure local DB tracking records first by creating an initial tracking state
  const createdRefund = await prisma.refund.create({
    data: {
      orderId: tickets[0].orderId,
      paymentId: tickets[0].order.payment.id,
      reason,
      totalAmountInPaise: totalTicketAmount,
      convenienceFeeInPaise: tickets[0].order.convenienceFeeInPaise,
      gstReversedInPaise: totalGstAmount,
      finalRefundAmountInPaise: finalRefundAmount,
      initiatedById: userId,
      status: "INITIATED",
    },
  });

  // Make external payment gateway call safely OUTSIDE of the Prisma transaction
  let gatewayRefund;
  try {
    gatewayRefund = await refundGateway.createRefund({
      paymentId: tickets[0].order.payment.gatewayPaymentId,
      amount: finalRefundAmount,
      notes: {
        refundId: createdRefund.id,
        orderId: orderId,
        userId: userId,
      },
    });
  } catch (error) {
    // Gracefully reflect the dynamic runtime gateway communication failure in our tracking logs
    await prisma.refund.update({
      where: { id: createdRefund.id },
      data: {
        status: "FAILED",
        failureReason: error.message,
      },
    });
    throw error;
  }

  // Evaluate what status the gateway dynamically resolved to
  const targetStatus = mapGatewayStatus(gatewayRefund.status);

  // Wrap post-gateway processing internal domain logic inside a clean, short transaction block
  const refundResult = await prisma.$transaction(async (tx) => {
    // Map and persist gateway metadata along with full gateway responses
    const updatedRefund = await tx.refund.update({
      where: {
        id: createdRefund.id,
      },
      data: {
        gatewayRefundId: gatewayRefund.id,
        status: targetStatus,
        gatewayResponse: gatewayRefund,
      },
    });

    // Create localized granular Refund Items records
    for (const ticket of tickets) {
      const deduction = Math.round((ticket.orderItem.priceInPaise * deductionPercent) / 100);

      await tx.refundItem.create({
        data: {
          refundId: createdRefund.id,
          ticketId: ticket.id,
          ticketPriceInPaise: ticket.orderItem.priceInPaise,
          deductionInPaise: deduction,
          gstAmountInPaise: ticket.orderItem.gstAmountInPaise,
          refundAmountInPaise:
            ticket.orderItem.priceInPaise + ticket.orderItem.gstAmountInPaise - deduction,
        },
      });
    }

    // Atomic application updates for active ticket tracking checks
    const updatedTickets = await tx.ticket.updateMany({
      where: {
        id: {
          in: ticketIds,
        },
        status: "ACTIVE",
      },
      data: {
        status: "REFUNDED",
      },
    });

    // Enforce optimistic check verification to counter concurrent racing conditions
    if (updatedTickets.count !== ticketIds.length) {
      throw new AppError("One or more tickets have already been processed for refunds.", 409);
    }

    // Adjust event inventory balances back to core capacity slots
    for (const ticket of tickets) {
      if (ticket.orderItem.ticketTypeId) {
        await tx.ticketType.update({
          where: {
            id: ticket.orderItem.ticketTypeId,
          },
          data: {
            bookedCount: {
              decrement: 1,
            },
          },
        });
      }

      if (ticket.orderItem.capacitySlotId) {
        await tx.capacitySlot.update({
          where: {
            id: ticket.orderItem.capacitySlotId,
          },
          data: {
            bookedCount: {
              decrement: 1,
            },
          },
        });
      }
    }

    // Track active remaining ticket counts to safely shift parent order status strings
    const activeTickets = await tx.ticket.count({
      where: {
        orderId,
        status: "ACTIVE",
      },
    });

    if (activeTickets === 0) {
      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "REFUNDED",
        },
      });
    } else {
      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "PARTIALLY_REFUNDED",
        },
      });
    }

    return {
      refundId: updatedRefund.id,
      orderId,
      status: updatedRefund.status,
      reason,
      refundedTickets: ticketIds.length,
      totalTicketAmountInPaise: totalTicketAmount,
      gstAmountInPaise: totalGstAmount,
      deductionInPaise: deductionAmount,
      refundAmountInPaise: finalRefundAmount,
      gatewayRefundId: gatewayRefund.id,
    };
  });

  return refundResult;
};

module.exports = {
  createRefund,
};
