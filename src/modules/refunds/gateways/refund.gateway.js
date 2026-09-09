/**
 * Refund States
 *
 * pending
 * processed
 * failed
 */

const Razorpay = require("razorpay");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");

// Initialize the Razorpay SDK instance using central environment configuration
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Initiates a full or partial refund for a specific payment via Razorpay.
 *
 * @param {Object} params
 * @param {string} params.paymentId - The original gateway payment ID (pay_***)
 * @param {number} params.amount - The refund amount in paise (e.g., ₹1.00 = 100 paise)
 * @param {Object} [params.notes] - Key-value metadata pairs to attach to the refund
 * @returns {Promise<Object>} Raw gateway response payload from Razorpay
 * @throws {AppError} If parameters are invalid or the gateway request fails
 */
const createRefund = async ({ paymentId, amount, notes }) => {
  // Input Validation
  if (!paymentId) {
    throw new AppError("Gateway payment ID is required.", 400);
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError("Refund amount must be greater than zero.", 400);
  }

  try {
    const payload = {
      payment_id: paymentId,
      amount: amount,
      notes: notes || {},
    };

    const response = await razorpay.refunds.create(payload);
    return response;
  } catch (error) {
    const message =
      error.error?.description ||
      error.description ||
      error.message ||
      "Failed to create refund via Razorpay.";

    throw new AppError(message, error.statusCode || 502);
  }
};

/**
 * Fetches the details of a specific refund using the gateway refund ID.
 *
 * @param {Object} params
 * @param {string} params.refundId - The gateway refund ID (rfnd_***)
 * @returns {Promise<Object>} Raw gateway response payload containing refund status
 * @throws {AppError} If the gateway request fails
 */
const fetchRefund = async ({ refundId }) => {
  try {
    const response = await razorpay.refunds.fetch(refundId);
    return response;
  } catch (error) {
    const message =
      error.error?.description ||
      error.description ||
      error.message ||
      "Failed to fetch refund from Razorpay.";

    throw new AppError(message, error.statusCode || 502);
  }
};

/**
 * Retrieves all refunds associated with a given gateway payment ID.
 *
 * @param {Object} params
 * @param {string} params.paymentId - The original gateway payment ID (pay_***)
 * @returns {Promise<Object>} Raw gateway response payload containing a list of refunds
 * @throws {AppError} If the gateway request fails
 */
const fetchAllRefunds = async ({ paymentId }) => {
  try {
    const response = await razorpay.refunds.all({
      payment_id: paymentId,
    });
    return response;
  } catch (error) {
    const message =
      error.error?.description ||
      error.description ||
      error.message ||
      "Failed to fetch all refunds from Razorpay.";

    throw new AppError(message, error.statusCode || 502);
  }
};

module.exports = {
  createRefund,
  fetchRefund,
  fetchAllRefunds,
};
