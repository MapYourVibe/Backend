const express = require("express");
const router = express.Router();

const adminController = require("./admin.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const {
  updateSystemConfigSchema,
  updateAccountStatusSchema,
  moderateListingSchema,
} = require("./admin.validation");

// Enforce baseline authorization walls explicitly to platform Admin users only
router.use(requireAuth);
router.use(requireRole("ADMIN"));

// Global Marketplace Parameters Control Route
router.put("/configuration", validate(updateSystemConfigSchema), adminController.setSystemConfig);

// Ecosystem Moderation & Account Override Vectors
router.patch(
  "/users/:userId/status",
  validate(updateAccountStatusSchema),
  adminController.updateUserStatus,
);
router.patch(
  "/listings/:listingId/moderate",
  validate(moderateListingSchema),
  adminController.moderateListing,
);

module.exports = router;
