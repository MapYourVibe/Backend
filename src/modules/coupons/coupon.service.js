const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const createCoupon = async (couponData, creatorUser) => {
  const isGlobalCoupon = !couponData.listingId;
  const isAdmin = creatorUser.role === "ADMIN";

  // Global (platform-wide) coupons mutate pricing on every listing, so only
  // admins may create them — never an organizer acting on behalf of the whole
  // marketplace.
  if (isGlobalCoupon && !isAdmin) {
    throw new AppError("Only administrators can create platform-wide coupons.", 403);
  }

  // If scoped to a listing, verify the creator actually owns it when the
  // creator is an organizer (admins may target any listing for curation).
  if (couponData.listingId && !isAdmin) {
    const listing = await prisma.listing.findUnique({
      where: { id: couponData.listingId },
      include: { organizer: true },
    });

    if (!listing) {
      throw new AppError("Target event listing not found.", 404);
    }

    if (listing.organizer.userId !== creatorUser.id) {
      throw new AppError("You do not have permission to create a coupon for this listing.", 403);
    }
  }

  // 1. Enforce uniqueness check on the code string
  const existingCoupon = await prisma.coupon.findUnique({
    where: { code: couponData.code },
  });

  if (existingCoupon) {
    throw new AppError("A promotional coupon with this code already exists.", 409);
  }

  return prisma.coupon.create({
    data: {
      listingId: couponData.listingId,
      code: couponData.code,
      discountType: couponData.discountType,
      value: couponData.discountValue,
      validFrom: new Date(),
      validTo: new Date(couponData.expiryDate),
      maxUses: couponData.maxRedemptions ?? null,
      usedCount: 0,
    },
  });
};

const verifyAndCalculateDiscount = async ({ code, listingId, currentOrderValueInPaise }) => {
  // 1. Fetch coupon details
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon) {
    throw new AppError("This coupon code is invalid or no longer active.", 404);
  }

  // 2. Check chronological validity boundaries (validFrom .. validTo)
  const now = new Date();
  if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
    throw new AppError("This promotional coupon has expired.", 400);
  }

  // 3. Check redemption volume caps (usedCount is incremented at checkout)
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError("This coupon code has reached its maximum usage limit.", 400);
  }

  // 4. Verify structural item boundaries (listing scope)
  if (coupon.listingId && coupon.listingId !== listingId) {
    throw new AppError("This coupon code is not applicable to the selected listing.", 400);
  }

  // 5. Compute dynamic discount mathematics safely
  let rawDiscountAmount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    rawDiscountAmount = Math.round((currentOrderValueInPaise * coupon.value) / 100);
  } else if (coupon.discountType === "FIXED_AMOUNT") {
    rawDiscountAmount = coupon.value;
  }

  // Cap discount amount at the total transaction level to prevent negative numbers
  const finalDiscountAmount = Math.min(rawDiscountAmount, currentOrderValueInPaise);
  const netOrderValue = currentOrderValueInPaise - finalDiscountAmount;

  return {
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.value,
    discountAmountInPaise: finalDiscountAmount,
    netOrderValueInPaise: netOrderValue,
  };
};

module.exports = {
  createCoupon,
  verifyAndCalculateDiscount,
};
