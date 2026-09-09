const { z } = require("zod");

const createOrderSchema = z.object({
  body: z.object({
    reservationIds: z
      .array(
        // Hardened constraint validation to ensure input perfectly matches CUID schema definitions
        z.string().cuid({ message: "Invalid reservation ID format." }),
      )
      .min(1, "At least one reservation is required")
      .max(20, "Maximum 20 reservations per order")
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Duplicate reservation IDs are not allowed",
      ),
  }),
});

const listOrdersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

module.exports = {
  createOrderSchema,
  listOrdersQuerySchema,
};
