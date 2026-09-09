const express = require("express");
const router = express.Router();

const analyticsController = require("./analytics.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const { dynamicRangeQuerySchema, popularEventsLimitSchema } = require("./analytics.validation");

// Public Endpoint: Trending velocity lists can be scraped by marketing widgets natively
router.get("/trending", validate(popularEventsLimitSchema), analyticsController.getPopularListings);

// Protected Tracks: Operational tracking boundaries requiring structural access role validations
router.get(
  "/platform-financials",
  requireAuth,
  requireRole("ADMIN"),
  validate(dynamicRangeQuerySchema),
  analyticsController.getPlatformFinancials,
);
router.get(
  "/platform-revenue",
  requireAuth,
  requireRole("ADMIN"),
  validate(dynamicRangeQuerySchema),
  analyticsController.getPlatformRevenue,
);
router.get(
  "/organizer-performance",
  requireAuth,
  requireRole("ORGANIZER"),
  validate(dynamicRangeQuerySchema),
  analyticsController.getOrganizerPerformance,
);

module.exports = router;
