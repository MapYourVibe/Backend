const reviewsService = require("./reviews.service");
const { success } = require("../../utils/apiResponse");

const toggleWishlist = async (req, res, next) => {
  try {
    const result = await reviewsService.toggleWishlistItem(req.user.id, req.body.listingId);
    return success(res, { data: result, message: result.message });
  } catch (error) {
    next(error);
  }
};

const getMyWishlist = async (req, res, next) => {
  try {
    const wishlist = await reviewsService.getUserWishlist(req.user.id);
    return success(res, { data: wishlist, message: "User wishlist bookmarked items retrieved." });
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const review = await reviewsService.postListingReview(
      req.user.id,
      req.params.listingId,
      req.body,
    );
    return success(res, {
      data: review,
      message: "Feedback submitted successfully.",
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

const getListingReviews = async (req, res, next) => {
  try {
    const catalog = await reviewsService.getListingReviewsCatalog(req.params.listingId);
    return success(res, { data: catalog, message: "Listing review feeds extracted successfully." });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    await reviewsService.removeReviewRecord(req.params.reviewId, req.user);
    return success(res, { message: "Review entry removed successfully from global logs." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleWishlist,
  getMyWishlist,
  createReview,
  getListingReviews,
  deleteReview,
};
