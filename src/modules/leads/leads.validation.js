const { z } = require("zod");

const createLeadSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().min(10).max(15).optional(),
    organization: z.string().trim().min(2, "Brand / crew name is required").max(200),
    city: z.string().trim().min(2, "City is required").max(100),
    website: z.string().trim().max(500).optional(),
    description: z.string().trim().min(10, "Tell us a bit more about your events").max(5000),
    expectedAudience: z.coerce.number().int().positive().optional(),
  }),
});

const adminUpdateLeadSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid lead ID" }),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    notes: z.string().trim().max(1000).optional(),
  }),
});

module.exports = { createLeadSchema, adminUpdateLeadSchema };
