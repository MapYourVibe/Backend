const express = require("express");
const router = express.Router();

const eventController = require("./event.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const {
  createEventSchema,
  updateEventSchema,
  reviewEventSchema,
  eventIdParamSchema,
  toggleFeaturedSchema,
} = require("./event.validation");

// Admin & Operations — Event Curation + Detail
// IMPORTANT: these MUST stay above the generic GET /:id route, otherwise
// "/admin/<id>" would be captured by the `:id` param and fail cuid validation.
router.get(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(eventIdParamSchema),
  eventController.adminEventDetail,
);
router.patch(
  "/admin/:id/featured",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(toggleFeaturedSchema),
  eventController.toggleFeatured,
);
router.patch(
  "/admin/:id/premium",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(toggleFeaturedSchema),
  eventController.togglePremium,
);
router.patch(
  "/admin/:id/position",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  eventController.updatePosition,
);
router.patch(
  "/admin/:id/suspend",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(eventIdParamSchema),
  eventController.suspendEvent,
);
router.patch(
  "/admin/:id/resume",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(eventIdParamSchema),
  eventController.resumeEvent,
);

// Public Access Discovery & Detail Mapping Feeds
router.get("/", eventController.listEvents);
router.get("/:id", validate(eventIdParamSchema), eventController.getEventDetail);

// Protected Operations Lifecycle Hooks
router.post(
  "/",
  requireAuth,
  requireRole("ORGANIZER", "ADMIN", "OPS"),
  validate(createEventSchema),
  eventController.createEvent,
);
router.patch(
  "/:id",
  requireAuth,
  requireRole("ORGANIZER", "ADMIN", "OPS"),
  validate(updateEventSchema),
  eventController.updateEvent,
);

// Admin & Operations Compliance Audit Routes
router.patch(
  "/admin/review/:id",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(reviewEventSchema),
  eventController.adminReview,
);

// Organizer Actions
router.patch(
  "/:id/sold-out",
  requireAuth,
  requireRole("ORGANIZER", "ADMIN"),
  eventController.markSoldOut,
);

module.exports = router;
