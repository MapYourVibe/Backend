const express = require("express");
const router = express.Router();

const financeController = require("./finance.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

// Import the new financial validation guards
const { requestPayoutSchema, adminResolvePayoutSchema } = require("./finance.validation");

// Organizer Specific Routes
router.get("/ledger", requireAuth, requireRole("ORGANIZER"), financeController.getMyLedger);
router.post(
  "/payouts/request",
  requireAuth,
  requireRole("ORGANIZER"),
  validate(requestPayoutSchema),
  financeController.requestPayout,
);
router.get(
  "/payouts/history",
  requireAuth,
  requireRole("ORGANIZER"),
  financeController.getMyPayouts,
);

// Admin / Operations Management Override Routes
router.patch(
  "/admin/payouts/:payoutId",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(adminResolvePayoutSchema),
  financeController.adminResolvePayout,
);

module.exports = router;
