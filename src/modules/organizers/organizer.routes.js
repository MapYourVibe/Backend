const express = require("express");
const router = express.Router();

const organizerController = require("./organizer.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const {
  updateOrganizerProfileSchema,
  submitKycSchema,
  adminVerifyOrganizerSchema,
  hostedOrganizersQuerySchema,
} = require("./organizer.validation");

// Organizer Management Operations Track
router.get("/me", requireAuth, requireRole("ORGANIZER"), organizerController.getMyProfile);
router.patch(
  "/me",
  requireAuth,
  requireRole("ORGANIZER"),
  validate(updateOrganizerProfileSchema),
  organizerController.updateMyProfile,
);
router.post(
  "/me/kyc",
  requireAuth,
  requireRole("ORGANIZER"),
  validate(submitKycSchema),
  organizerController.submitKyc,
);

// Admin & Ops Operations Compliance Verification Routes
router.get(
  "/admin/hosted",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(hostedOrganizersQuerySchema),
  organizerController.listHostedOrganizers,
);
router.patch(
  "/admin/verify/:organizerId",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(adminVerifyOrganizerSchema),
  organizerController.adminVerify,
);

module.exports = router;
