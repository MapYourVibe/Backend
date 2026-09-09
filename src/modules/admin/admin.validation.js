const { z } = require("zod");

const updateSystemConfigSchema = z.object({
  body: z.object({
    baseCommissionBasisPoints: z.coerce.number().int().nonnegative().max(10000).optional(), // Max 100%
    tcsPercent: z.coerce.number().min(0).max(100).optional(),
    globalRefundDeductionPercent: z.coerce.number().min(0).max(100).optional(),
  }),
});

const updateAccountStatusSchema = z.object({
  params: z.object({
    userId: z.string().cuid({ message: "Invalid target User ID format." }),
  }),
  body: z.object({
    status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"], {
      errorMap: () => ({ message: "Status must be either ACTIVE, SUSPENDED, or BANNED." }),
    }),
    reason: z
      .string()
      .trim()
      .min(5, "Provide an explicit audit log reason for this override action.")
      .max(500),
  }),
});

const moderateListingSchema = z.object({
  params: z.object({
    listingId: z.string().cuid({ message: "Invalid target Listing ID format." }),
  }),
  body: z.object({
    status: z.enum(["ACTIVE", "DRAFT", "SUSPENDED", "REJECTED"], {
      errorMap: () => ({ message: "Status must be ACTIVE, DRAFT, SUSPENDED, or REJECTED." }),
    }),
    adminNotes: z
      .string()
      .trim()
      .min(5, "Compliance notes must explain this catalog state variation.")
      .max(500),
  }),
});

module.exports = {
  updateSystemConfigSchema,
  updateAccountStatusSchema,
  moderateListingSchema,
};
