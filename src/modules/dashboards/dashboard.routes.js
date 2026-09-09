const express = require("express");
const router = express.Router();

const dashboardController = require("./dashboard.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const { performancePeriodSchema } = require("./dashboard.validation");

// Enforce standard user authentication layer natively across all panels
router.use(requireAuth);

router.get("/user", dashboardController.getUserPanel);
router.get(
  "/organizer",
  requireRole("ORGANIZER", "ADMIN"),
  validate(performancePeriodSchema),
  dashboardController.getOrganizerPanel,
);
router.get("/admin", requireRole("ADMIN", "OPS"), dashboardController.getAdminPanel);
router.get("/organizer/events", requireRole("ORGANIZER", "ADMIN"), dashboardController.getOrganizerEvents);
router.get("/organizer/events/:eventId", requireRole("ORGANIZER", "ADMIN"), dashboardController.getOrganizerEventDetail);

module.exports = router;
