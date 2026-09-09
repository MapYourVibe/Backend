const refundService = require("./refund.service");
const apiResponse = require("../../utils/apiResponse");

/**
 * Handles the HTTP request to initiate a ticket refund.
 * Delegates all business logic, data calculations, and validations to the service layer.
 */
const createRefund = async (req, res, next) => {
  try {
    const { ticketIds, reason } = req.body;
    const userId = req.user.id;

    // Execute refund process via the service layer
    const refund = await refundService.createRefund({
      userId,
      ticketIds,
      reason,
    });

    // ✅ Fixed: Wrapped options into standard object structure expected by custom response interceptors
    return apiResponse.success(res, {
      data: refund,
      message: "Refund initiated successfully.",
      statusCode: 200,
    });
  } catch (error) {
    // Pass any caught errors to the global centralized error handler
    next(error);
  }
};

module.exports = {
  createRefund,
};
