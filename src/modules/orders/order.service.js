const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

class OrderService {
  async createOrder(userId, reservationIds) {
    // -------------------------------------------------------
    // Step 1: Fetch reservations
    // -------------------------------------------------------
    const reservations = await prisma.orderReservation.findMany({
      where: {
        id: {
          in: reservationIds,
        },
        orderId: null,
      },
      include: {
        ticketType: {
          include: {
            listing: true,
          },
        },
      },
    });

    // -------------------------------------------------------
    // Step 2: Validate reservations exist
    // -------------------------------------------------------
    if (reservations.length !== reservationIds.length) {
      throw new AppError("One or more reservations were not found", 404);
    }

    // -------------------------------------------------------
    // Step 3: Verify reservation ownership
    // -------------------------------------------------------
    for (const reservation of reservations) {
      if (reservation.userId !== userId) {
        throw new AppError("You are not authorized to use one or more reservations", 403);
      }
    }

    // -------------------------------------------------------
    // Step 4: Verify reservation status
    // -------------------------------------------------------
    for (const reservation of reservations) {
      if (reservation.status !== "HELD") {
        throw new AppError(
          `Reservation ${reservation.id} is no longer available for checkout`,
          400,
        );
      }
    }

    // -------------------------------------------------------
    // Step 5: Verify reservations have not expired
    // -------------------------------------------------------
    const now = new Date();

    for (const reservation of reservations) {
      if (reservation.expiresAt <= now) {
        throw new AppError(`Reservation ${reservation.id} has expired`, 400);
      }
    }

    for (const reservation of reservations) {
      if (!reservation.ticketType) {
        throw new AppError("Attraction bookings are not supported yet", 400);
      }
    }

    // -------------------------------------------------------
    // Step 6: Verify same listing
    // -------------------------------------------------------
    const listingId = reservations[0].ticketType.listing.id;

    for (const reservation of reservations) {
      if (reservation.ticketType.listing.id !== listingId) {
        throw new AppError("All reservations must belong to the same listing", 400);
      }
    }

    // -------------------------------------------------------
    // Step 7: Load platform settings and calculate pricing variables
    // -------------------------------------------------------
    const platformSettings = await prisma.platformSettings.findFirst();
    if (!platformSettings) {
      throw new AppError("Platform configurations are missing.", 500);
    }

    const feePercent = Number(platformSettings.bookingFeePercent);
    const feeGstPercent = Number(platformSettings.bookingFeeGstPercent);

    let subtotalInPaise = 0;
    let totalTicketGstInPaise = 0;
    const ticketGstPercent = 18.0; // Standard structural default event tier

    // ✅ Map items arrays early to guarantee item-to-order rounding symmetry
    const preparedItems = reservations.map((reservation) => {
      const unitPrice = reservation.ticketType.priceInPaise;
      const quantity = reservation.quantity;
      const itemSubtotal = unitPrice * quantity;

      // Per-tier GST configuration (defaults preserved for legacy tiers)
      const gstRate = Number(reservation.ticketType.gstPercent ?? ticketGstPercent);
      const gstInclusive = Boolean(reservation.ticketType.gstInclusive);

      // Net (pre-GST) sales base the platform fee + commission are computed on
      let netInPaise, itemGstAmount, grossInPaise;
      if (gstInclusive) {
        // price already includes GST → back it out: net = gross * 100/(100+rate)
        const netUnit = Math.round((unitPrice * 100) / (100 + gstRate));
        netInPaise = netUnit * quantity;
        grossInPaise = unitPrice * quantity; // no GST added
        itemGstAmount = grossInPaise - netInPaise;
      } else {
        // price is GST-exclusive → add GST on top
        netInPaise = itemSubtotal;
        itemGstAmount = Math.round(itemSubtotal * (gstRate / 100));
        grossInPaise = netInPaise + itemGstAmount;
      }

      subtotalInPaise += grossInPaise;
      totalTicketGstInPaise += itemGstAmount;

      return {
        ticketTypeId: reservation.ticketTypeId,
        capacitySlotId: reservation.capacitySlotId,
        quantity: quantity,
        ticketName: reservation.ticketType.name,
        priceInPaise: unitPrice,
        netInPaise,
        gstPercent: gstRate,
        gstInclusive: gstInclusive,
        gstAmountInPaise: itemGstAmount, // Secure structural snapshot
      };
    });

    // Calculate platform convenience fee using loaded dynamic settings coefficients (on net sales base)
    const netSubtotalInPaise = preparedItems.reduce((s, i) => s + i.netInPaise, 0);
    const convenienceFeeInPaise = Math.round(netSubtotalInPaise * (feePercent / 100));
    const convenienceFeeGstInPaise = Math.round(convenienceFeeInPaise * (feeGstPercent / 100));

    // Total aggregate order level tax encompasses ticket item tax and platform service tax
    const gstAmountInPaise = totalTicketGstInPaise + convenienceFeeGstInPaise;
    const tcsAmountInPaise = 0;

    const totalInPaise = subtotalInPaise + convenienceFeeInPaise + convenienceFeeGstInPaise + tcsAmountInPaise;

    // -------------------------------------------------------
    // Step 8-11: Transaction execution layer
    // -------------------------------------------------------
    const order = await prisma.$transaction(async (tx) => {
      // Create Order
      const createdOrder = await tx.order.create({
        data: {
          userId,
          listingId,
          status: "PENDING",
          subtotalInPaise,
          gstAmountInPaise,
          convenienceFeeInPaise,
          tcsAmountInPaise,
          totalInPaise,
        },
      });

      // ✅ Insert item array mapping with proper parent order references attached
      await tx.orderItem.createMany({
        data: preparedItems.map((item) => ({
          ...item,
          orderId: createdOrder.id,
        })),
      });

      // Link Reservations securely
      const updatedReservations = await tx.orderReservation.updateMany({
        where: {
          id: {
            in: reservationIds,
          },
          status: "HELD",
          orderId: null,
        },
        data: {
          orderId: createdOrder.id,
        },
      });

      if (updatedReservations.count !== reservationIds.length) {
        throw new AppError("One or more reservations are no longer available", 409);
      }

      // Return Complete Order snapshot state details
      return await tx.order.findUnique({
        where: {
          id: createdOrder.id,
        },
        include: {
          listing: true,
          items: true,
          reservations: true,
        },
      });
    });

    return order;
  }

  async listOrders({ page = 1, limit = 50 } = {}) {
    const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {
      OR: [{ status: "CONFIRMED" }, { payment: { status: "FAILED" } }],
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          payment: { select: { status: true } },
          items: { select: { id: true, ticketName: true, quantity: true, priceInPaise: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    return { items: orders, total, page: Math.max(parseInt(page, 10) || 1, 1), limit: take };
  }
}

module.exports = new OrderService();
