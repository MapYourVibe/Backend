const financeService = require("./finance.service");
const { success } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");

const getMyLedger = async (req, res, next) => {
  try {
    // Traverse relationship maps to guarantee the caller has an active profile
    const organizerProfile =
      (await req.prismaContext?.organizerProfile) || (await req.user.organizerProfile);
    const organizerId = organizerProfile?.id;

    if (!organizerId) {
      throw new AppError(
        "Access denied. No active Organizer profile linked to this user profile.",
        403,
      );
    }

    const ledger = await financeService.getOrganizerLedger(organizerId);
    return success(res, { data: ledger, message: "Ledger details aggregated successfully." });
  } catch (error) {
    next(error);
  }
};

const requestPayout = async (req, res, next) => {
  try {
    const organizerProfile = req.user.organizerProfile;
    const organizerId = organizerProfile?.id;

    if (!organizerId) {
      throw new AppError("Access denied. No active Organizer profile linked.", 403);
    }

    const payout = await financeService.initiatePayout({
      organizerId,
      requestedAmountInPaise: req.body.amountInPaise,
    });

    return success(res, {
      data: payout,
      message: "Payout settlement order submitted for approval successfully.",
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

const adminResolvePayout = async (req, res, next) => {
  try {
    const { payoutId } = req.params;
    const { status } = req.body;

    const updatedPayout = await financeService.updatePayoutStatus(payoutId, status);
    return success(res, {
      data: updatedPayout,
      message: "Payout execution state settled successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const getMyPayouts = async (req, res, next) => {
  try {
    const organizerId = req.user.organizerProfile?.id;
    if (!organizerId) {
      throw new AppError("Access denied. No active Organizer profile linked.", 403);
    }

    const history = await financeService.getPayoutHistory(organizerId);
    return success(res, { data: history, message: "Payout logs retrieved successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyLedger,
  requestPayout,
  adminResolvePayout,
  getMyPayouts,
};
