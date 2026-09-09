const Razorpay = require("razorpay");
const crypto = require("crypto");

const env = require("../../../config/env");

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

const createOrder = async ({ amount, currency = "INR", receipt, notes = {} }) => {
  return razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes,
  });
};

const verifySignature = ({ orderId, paymentId, signature }) => {
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string"
  ) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
};

const verifyWebhookSignature = ({ body, signature }) => {
  if (typeof body !== "string" || typeof signature !== "string") {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf8"),
    Buffer.from(signature, "utf8"),
  );
};

module.exports = {
  createOrder,
  verifySignature,
  verifyWebhookSignature,
};
