const express = require("express");
const router = express.Router();

const notificationController = require("./notification.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const { sendTestNotificationSchema } = require("./notification.validation");

// Enforce baseline user authorization across notification history paths
router.get("/history", requireAuth, notificationController.getMyHistory);

// Restrict raw systemic testing capabilities strictly to platform operators
router.post(
  "/admin/dispatch",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(sendTestNotificationSchema),
  notificationController.adminSendManualNotification,
);

module.exports = router;
