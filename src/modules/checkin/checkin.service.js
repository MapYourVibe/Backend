const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const scanTicket = async ({ ticketNumber, scannedBy, scannerRole }) => {
  // 1. Find ticket using the correct relational schema path
  const ticket = await prisma.ticket.findUnique({
    where: {
      ticketNumber,
    },
    include: {
      order: true,
      checkIn: true,
      orderItem: {
        include: {
          ticketType: {
            include: {
              listing: {
                include: {
                  // ✅ Fixed: Traversed organizer profile to find the actual system user ID
                  organizer: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // 2. Ticket must exist
  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  // 3. Ticket must be active
  if (ticket.status !== "ACTIVE") {
    throw new AppError("Ticket is not valid for check-in", 400);
  }

  // 4. Ticket must not already be checked in
  if (ticket.checkIn) {
    throw new AppError("Ticket has already been checked in", 409);
  }

  // 5. Extract organizer ownership mapping safely
  const organizerUserId = ticket.orderItem.ticketType?.listing?.organizer?.userId;

  if (!organizerUserId) {
    throw new AppError("Event organizer details not found", 404);
  }

  // ✅ Fixed: Only enforce ownership constraints if the scanner isn't an global ADMIN
  if (scannerRole !== "ADMIN" && organizerUserId !== scannedBy) {
    throw new AppError("You are not authorized to check in tickets for this event", 403);
  }

  // 6. Check in ticket atomically
  const result = await prisma.$transaction(async (tx) => {
    // ✅ Critical Fix: Used updateMany with structural state filters to eliminate simultaneous barcode scan race conditions
    const updatedTickets = await tx.ticket.updateMany({
      where: {
        id: ticket.id,
        status: "ACTIVE",
      },
      data: {
        status: "USED",
      },
    });

    // If another entry gate won the race micro-seconds before us, the count will be 0
    if (updatedTickets.count === 0) {
      throw new AppError("Ticket has already been processed or checked in.", 409);
    }

    const checkIn = await tx.checkIn.create({
      data: {
        ticketId: ticket.id,
        scannedBy,
      },
    });

    return {
      ticketId: ticket.id,
      status: "USED",
      checkIn,
    };
  });

  // 7. Return clean response payload
  return {
    ticketId: result.ticketId,
    ticketNumber,
    ticketStatus: result.status,
    checkedInAt: result.checkIn.scannedAt,
  };
};

module.exports = {
  scanTicket,
};
