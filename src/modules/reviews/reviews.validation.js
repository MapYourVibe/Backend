const { z } = require("zod");

const toggleWishlistSchema = z.object({
  body: z.object({
    listingId: z.string().cuid({ message: "Invalid Listing ID format linkage." }),
  }),
});

const createReviewSchema = z.object({
  params: z.object({
    listingId: z.string().cuid({ message: "Invalid Listing ID format structure." }),
  }),
  body: z.object({
    // Fixed: changed from z.z.coerce to z.coerce
    rating: z.coerce
      .number()
      .int({ message: "Rating score must be a whole integer." })
      .min(1, { message: "Minimum permissible rating is 1 star." })
      .max(5, { message: "Maximum permissible rating is 5 stars." }),
    text: z.string().trim().min(5, "Review text must be at least 5 characters long.").max(1000),
  }),
});

const reviewIdParamSchema = z.object({
  params: z.object({
    reviewId: z.string().cuid({ message: "Invalid Review ID format structure." }),
  }),
});

module.exports = {
  toggleWishlistSchema,
  createReviewSchema,
  reviewIdParamSchema,
};
