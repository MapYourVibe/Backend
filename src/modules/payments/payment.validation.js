const { z } = require("zod");

// Hardened validation keys to strictly enforce CUID standard structure matching database models
const createPaymentSchema = z.object({
  orderId: z.string().cuid({ message: "Invalid Order ID format." }),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().cuid({ message: "Invalid Order ID format." }),

  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),

  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),

  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

module.exports = {
  createPaymentSchema,
  verifyPaymentSchema,
};
