const express = require("express");
const router = express.Router();

const reviewsController = require("./reviews.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");

const {
  toggleWishlistSchema,
  createReviewSchema,
  reviewIdParamSchema,
} = require("./reviews.validation");

// Public Feeds Routing Track
router.get("/listing/:listingId", reviewsController.getListingReviews);

// Protected Tracks: Requires full authentication checks
router.get("/wishlist", requireAuth, reviewsController.getMyWishlist);
router.post(
  "/wishlist/toggle",
  requireAuth,
  validate(toggleWishlistSchema),
  reviewsController.toggleWishlist,
);
router.post(
  "/listing/:listingId",
  requireAuth,
  validate(createReviewSchema),
  reviewsController.createReview,
);
router.delete(
  "/:reviewId",
  requireAuth,
  validate(reviewIdParamSchema),
  reviewsController.deleteReview,
);

module.exports = router;
