const { redis } = require("../../config/redis");
const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");
const { RESERVATION_HOLD_MINUTES } = require("../../config/constants");

const KEY_PREFIX = "inventory:";

// Atomic check-and-decrement via Lua
redis.defineCommand("decrementIfEnough", {
  numberOfKeys: 1,
  lua: `
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')
    local qty = tonumber(ARGV[1])
    if current >= qty then
      return redis.call('DECRBY', KEYS[1], qty)
    else
      return -1
    end
  `,
});

function inventoryKey(entityType, entityId) {
  return `${KEY_PREFIX}${entityType}:${entityId}`;
}

async function initializeAvailability(entityType, entityId, quantity) {
  await redis.set(inventoryKey(entityType, entityId), quantity);
}

async function getAvailability(entityType, entityId) {
  const value = await redis.get(inventoryKey(entityType, entityId));
  return value === null ? 0 : parseInt(value, 10);
}

async function reserve({ userId, entityType, entityId, quantity }) {
  if (quantity < 1) {
    throw new AppError("Quantity must be at least 1", 400);
  }

  const key = inventoryKey(entityType, entityId);

  let ticketTypeRecord = null;

  if (entityType === "TICKET_TYPE") {
    ticketTypeRecord = await prisma.ticketType.findUnique({
      where: { id: entityId },
      include: { listing: { select: { bookingStatus: true } } },
    });
    if (!ticketTypeRecord) throw new AppError("Ticket type not found", 404);
    if (ticketTypeRecord.listing.bookingStatus !== "OPEN") {
      throw new AppError("This event is no longer accepting bookings", 410);
    }
  }

  const exists = await redis.exists(key);
  if (!exists) {
    if (entityType === "TICKET_TYPE" && ticketTypeRecord) {
      await redis.set(key, ticketTypeRecord.totalQuantity);
    }
  }

  const result = await redis.decrementIfEnough(key, quantity);

  if (result === -1) {
    throw new AppError("Not enough tickets available", 409);
  }

  const expiresAt = new Date(Date.now() + RESERVATION_HOLD_MINUTES * 60 * 1000);

  try {
    const reservation = await prisma.orderReservation.create({
      data: {
        userId,
        quantity,
        expiresAt,
        status: "HELD",
        ...(entityType === "TICKET_TYPE"
          ? { ticketTypeId: entityId }
          : { capacitySlotId: entityId }),
      },
    });
    return reservation;
  } catch (err) {
    await redis.incrby(key, quantity);
    throw err;
  }
}

async function confirmReservation(reservationId, userId) {
  // ✅ Ownership validation handled securely in the service layer before updates
  const reservation = await prisma.orderReservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation || reservation.userId !== userId) {
    throw new AppError("Reservation not found", 404);
  }

  const result = await prisma.orderReservation.updateMany({
    where: { id: reservationId, userId, status: "HELD", expiresAt: { gt: new Date() } },
    data: { status: "CONFIRMED" },
  });

  if (result.count === 0) {
    throw new AppError("This reservation has expired or is no longer valid", 410);
  }

  return prisma.orderReservation.findUnique({ where: { id: reservationId } });
}

// ✅ Extended to accept an optional userId to allow secure manual customer cancellations
// while keeping it unconstrained when invoked automatically by the background expiration sweep
async function releaseReservation(reservationId, userId = null) {
  const reservation = await prisma.orderReservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation || (userId && reservation.userId !== userId)) {
    throw new AppError("Reservation not found", 404);
  }

  const result = await prisma.orderReservation.updateMany({
    where: { id: reservationId, status: "HELD" },
    data: { status: "EXPIRED" },
  });

  if (result.count === 1) {
    const entityType = reservation.ticketTypeId ? "TICKET_TYPE" : "CAPACITY_SLOT";
    const entityId = reservation.ticketTypeId ?? reservation.capacitySlotId;
    await redis.incrby(inventoryKey(entityType, entityId), reservation.quantity);
  }

  return result.count === 1;
}

async function sweepExpiredReservations() {
  const expired = await prisma.orderReservation.findMany({
    where: { status: "HELD", expiresAt: { lt: new Date() } },
    select: { id: true },
  });

  let releasedCount = 0;
  for (const { id } of expired) {
    // The background job passes only the ID, completely bypassing ownership restrictions safely
    const wasReleased = await releaseReservation(id);
    if (wasReleased) releasedCount++;
  }

  return releasedCount;
}

module.exports = {
  initializeAvailability,
  getAvailability,
  reserve,
  confirmReservation,
  releaseReservation,
  sweepExpiredReservations,
};
