const { z } = require("zod");

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    phone: z.string().trim().min(10).max(15).optional(),
    profilePictureUrl: z.string().url("Enter a valid secure asset URL").optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter",
      })
      .refine((val) => /[0-9]/.test(val), { message: "Password must contain at least one number" }),
  }),
});

const updatePreferencesSchema = z.object({
  body: z.object({
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    pushEnabled: z.boolean(),
  }),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updatePreferencesSchema,
};
