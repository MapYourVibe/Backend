const { z } = require("zod");

const createCouponSchema = z.object({
  body: z
    .object({
      code: z
        .string()
        .trim()
        .min(3)
        .max(20)
        .toUpperCase()
        .regex(/^[A-Z0-9_-]+$/, {
          message:
            "Coupon code must be uppercase alphanumeric characters, dashes, or underscores only.",
        }),
      discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], {
        errorMap: () => ({ message: "Discount type must be either PERCENTAGE or FIXED_AMOUNT." }),
      }),
      discountValue: z.number().int().positive("Discount value must be a positive integer"),
      maxRedemptions: z.number().int().positive().optional(),
      expiryDate: z
        .string()
        .datetime({ message: "Expiry date must be a valid ISO datetime string." }),
      listingId: z.string().cuid({ message: "Invalid Listing ID format linkage." }).optional(),
    })
    .refine(
      (data) => {
        if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
          return false;
        }
        return true;
      },
      {
        message: "Percentage discounts cannot exceed 100%.",
        path: ["discountValue"],
      },
    ),
});

const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1).toUpperCase(),
    listingId: z.string().cuid({ message: "Invalid Listing ID format structure." }),
    currentOrderValueInPaise: z.number().int().positive(),
  }),
});

module.exports = {
  createCouponSchema,
  validateCouponSchema,
};
