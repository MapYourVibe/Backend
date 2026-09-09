const Razorpay = require("razorpay");
const env = require("../../../config/env");

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

const createRefund = async ({ paymentId, amount, notes }) => {
  const refund = await razorpay.payments.refund(paymentId, {
    amount,
    notes,
  });

  return {
    id: refund.id,
    status: refund.status,
  };
};

module.exports = {
  createRefund,
};
