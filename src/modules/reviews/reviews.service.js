const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

/**
 * Toggles listing bookmarks. If it's already bookmarked, it removes it;
 * otherwise, it adds it to the user's wishlist.
 */
const toggleWishlistItem = async (userId, listingId) => {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "ACTIVE") {
    throw new AppError("Target active event listing profile not found.", 404);
  }

  const existingBookmark = await prisma.wishlist.findFirst({
    where: { userId, listingId },
  });

  if (existingBookmark) {
    await prisma.wishlist.delete({ where: { id: existingBookmark.id } });
    return { bookmarked: false, message: "Listing removed from wishlist." };
  }

  const newBookmark = await prisma.wishlist.create({
    data: { userId, listingId },
  });

  return { bookmarked: true, data: newBookmark, message: "Listing added to wishlist." };
};

const getUserWishlist = async (userId) => {
  return prisma.wishlist.findMany({
    where: { userId },
    include: {
      listing: {
        include: {
          venue: { select: { name: true, city: true } },
          ticketTypes: { select: { priceInPaise: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Commits user ratings. Enforces verified purchase constraints before allowing data mutations.
 */
const postListingReview = async (userId, listingId, { rating, text }) => {
  // 1. Verify existence of the targeted catalog listing
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new AppError("Target event listing not found.", 404);

  // 2. Spam Prevention Boundary: Check for a fully settled ticket transaction matching this listing
  const hasAttended = await prisma.order.count({
    where: {
      userId,
      listingId,
      status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] },
    },
  });

  if (hasAttended === 0) {
    throw new AppError(
      "Access Denied. Review submission is restricted strictly to verified ticket holders.",
      403,
    );
  }

  // 3. Prevent duplicate submissions from the same user profile
  const alreadyReviewed = await prisma.review.count({
    where: { userId, listingId },
  });

  if (alreadyReviewed > 0) {
    throw new AppError(
      "Duplicate Entry. You have already submitted feedback for this event listing.",
      400,
    );
  }

  // 4. Create the review record
  return prisma.review.create({
    data: { userId, listingId, rating, text },
    include: { user: { select: { name: true, profilePictureUrl: true } } },
  });
};

const getListingReviewsCatalog = async (listingId) => {
  const [reviewsList, aggregation] = await Promise.all([
    prisma.review.findMany({
      where: { listingId },
      include: { user: { select: { name: true, profilePictureUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  return {
    reviews: reviewsList,
    metrics: {
      totalReviewsCount: aggregation._count.id,
      calculatedAverageRating: aggregation._avg.rating
        ? Number(aggregation._avg.rating.toFixed(2))
        : 0.0,
    },
  };
};

const removeReviewRecord = async (reviewId, requestingUser) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Target review record not found.", 404);

  // Authorization Shield: Only the author or a platform administrator can delete a review
  if (review.userId !== requestingUser.id && !["ADMIN", "OPS"].includes(requestingUser.role)) {
    throw new AppError(
      "Unauthorized action. You do not have permission to delete this review.",
      403,
    );
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return { success: true };
};

module.exports = {
  toggleWishlistItem,
  getUserWishlist,
  postListingReview,
  getListingReviewsCatalog,
  removeReviewRecord,
};
