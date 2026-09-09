const express = require("express");

const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");

const refundController = require("./refund.controller");

const { createRefundSchema } = require("./refund.validation");

/**
 * POST /api/refunds
 * Initiate a full or partial ticket refund.
 */
router.post("/", auth, validate(createRefundSchema), refundController.createRefund);

module.exports = router;
