const { z } = require("zod");

const updateOrganizerProfileSchema = z.object({
  body: z.object({
    businessName: z
      .string()
      .trim()
      .min(3, "Business name must be at least 3 characters")
      .max(150)
      .optional(),
    supportEmail: z.string().email("Enter a valid support email address").optional(),
    supportPhone: z.string().trim().min(10).max(15).optional(),
    businessAddress: z.string().trim().min(5, "Enter a complete structural address").optional(),
  }),
});

const submitKycSchema = z.object({
  body: z.object({
    companyRegistrationNumber: z.string().trim().min(1, "Company registration number is required"),
    // Strictly checks the standard 15-character format for Indian GSTIN
    gstin: z
      .string()
      .trim()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
        message: "Invalid GSTIN format structure.",
      })
      .optional()
      .or(z.literal("")),
    // Validates standard 10-character alphanumeric Indian PAN format
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
        message: "Invalid permanent account number (PAN) format.",
      }),
    bankAccountName: z.string().trim().min(3, "Account beneficiary name is required"),
    bankAccountNumber: z.string().trim().min(9, "Invalid bank account number length").max(18),
    // Standard alphanumeric IFSC code layout matching Indian banking systems
    bankIfscCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
        message: "Invalid bank IFSC code format structure.",
      }),
  }),
});

const adminVerifyOrganizerSchema = z.object({
  params: z.object({
    organizerId: z.string().cuid({ message: "Invalid Organizer ID format." }),
  }),
  body: z.object({
    approvalStatus: z.enum(["APPROVED", "REJECTED", "SUSPENDED"], {
      errorMap: () => ({ message: "Status must be APPROVED, REJECTED, or SUSPENDED." }),
    }),
    verificationNotes: z.string().trim().max(500).optional(),
  }),
});

const hostedOrganizersQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

module.exports = {
  updateOrganizerProfileSchema,
  submitKycSchema,
  adminVerifyOrganizerSchema,
  hostedOrganizersQuerySchema,
};
