const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");
const { generateTicketNumber, generateQrPayload } = require("./ticket.utils");

const generateTickets = async ({ orderId }) => {
  // 1. Find the order with comprehensive relational maps for both Events and Attractions
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      items: {
        include: {
          ticketType: {
            select: {
              listingId: true,
            },
          },
          capacitySlot: {
            select: {
              listingId: true,
            },
          },
        },
      },
    },
  });

  // 2. Order must exist
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // 3. Order must be confirmed
  if (order.status !== "CONFIRMED") {
    throw new AppError("Tickets can only be generated for confirmed orders", 400);
  }

  // 4. Order must contain items
  if (order.items.length === 0) {
    throw new AppError("Order contains no items", 400);
  }

  // 5. Prevent duplicate ticket generation (Idempotency check)
  const existingTickets = await prisma.ticket.count({
    where: {
      orderId: order.id,
    },
  });

  if (existingTickets > 0) {
    throw new AppError("Tickets have already been generated for this order", 409);
  }

  // 6. Build ticket data
  const ticketsToCreate = [];

  for (const item of order.items) {
    // ✅ Fixed: Safely fall back between event and attraction layouts to read listingId correctly
    const listingId = item.ticketType?.listingId ?? item.capacitySlot?.listingId;

    if (!listingId) {
      throw new AppError("Associated event listing details not found for order items", 404);
    }

    for (let i = 0; i < item.quantity; i++) {
      const ticketNumber = generateTicketNumber();

      const qrPayload = generateQrPayload({
        ticketNumber,
        listingId,
      });

      ticketsToCreate.push({
        orderId: order.id,
        orderItemId: item.id,
        ticketNumber,
        qrCode: qrPayload,
        status: "ACTIVE",
      });
    }
  }

  // 7. Create all tickets atomically inside a short database transaction
  let createdTickets;

  try {
    createdTickets = await prisma.$transaction(async (tx) => {
      const tickets = [];

      for (const ticketData of ticketsToCreate) {
        const createdTicket = await tx.ticket.create({
          data: ticketData,
        });

        tickets.push(createdTicket);
      }

      return tickets;
    });
  } catch (error) {
    // Unique constraint violation check for ticket numbers or QR payloads
    if (error.code === "P2002") {
      throw new AppError(
        "Failed to generate unique ticket numbers due to a collision. Please try again.",
        500,
      );
    }

    throw error;
  }

  // 8. Return created tickets DTO array
  return createdTickets;
};

module.exports = {
  generateTickets,
};
