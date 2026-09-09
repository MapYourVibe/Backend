const express = require("express");

const router = express.Router();

const paymentController = require("./payment.controller");
const validate = require("../../middlewares/validate.middleware");
const requireAuth = require("../../middlewares/auth.middleware");

const { createPaymentSchema, verifyPaymentSchema } = require("./payment.validation");

router.post("/create", requireAuth, validate(createPaymentSchema), paymentController.createPayment);

router.post("/verify", requireAuth, validate(verifyPaymentSchema), paymentController.verifyPayment);

// Razorpay webhook endpoint.
// This route must remain public because requests originate from Razorpay servers.
// Webhook authenticity is verified using the x-razorpay-signature header.

router.post("/webhook", paymentController.webhook);

module.exports = router;
