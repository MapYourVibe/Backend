const inventoryService = require("./inventory.service");
const { success } = require("../../utils/apiResponse");

async function getAvailability(req, res, next) {
  try {
    const { entityType, entityId } = req.params;

    const available = await inventoryService.getAvailability(entityType, entityId);

    return success(res, {
      data: {
        entityType,
        entityId,
        available,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function reserve(req, res, next) {
  try {
    const { entityType, entityId, quantity } = req.body;

    const reservation = await inventoryService.reserve({
      userId: req.user.id,
      entityType,
      entityId,
      quantity,
    });

    return success(res, {
      data: reservation,
      message: `Held for ${reservation.quantity} ticket(s) — complete checkout before it expires`,
      statusCode: 201,
    });
  } catch (err) {
    next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const { reservationId } = req.params;

    // ✅ DB query removed from controller; authorization context passed directly to service layer
    const confirmedReservation = await inventoryService.confirmReservation(
      reservationId,
      req.user.id,
    );

    return success(res, {
      message: "Reservation confirmed",
      data: confirmedReservation,
    });
  } catch (err) {
    next(err);
  }
}

async function release(req, res, next) {
  try {
    const { reservationId } = req.params;

    // ✅ Relocated authorization check logic to the service boundary to keep controller completely thin
    await inventoryService.releaseReservation(reservationId, req.user.id);

    return success(res, {
      message: "Reservation released",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailability,
  reserve,
  confirm,
  release,
};
