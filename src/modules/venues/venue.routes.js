const express = require("express");
const router = express.Router();

const venueController = require("./venue.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const { createVenueSchema, updateVenueSchema, venueIdParamSchema } = require("./venue.validation");

// Public Access Discovery Pathing
router.get("/", venueController.getAllVenues);
router.get("/:id", validate(venueIdParamSchema), venueController.getVenueById);

// Protected Operations Spatial Configuration Mapping (Restricted to Event Creators and Admins)
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "OPS", "ORGANIZER"),
  validate(createVenueSchema),
  venueController.createVenue,
);
router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "OPS", "ORGANIZER"),
  validate(updateVenueSchema),
  venueController.updateVenue,
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(venueIdParamSchema),
  venueController.deleteVenue,
);

module.exports = router;
