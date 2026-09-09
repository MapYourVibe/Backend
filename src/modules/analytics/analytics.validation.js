const { z } = require("zod");

const dynamicRangeQuerySchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .datetime({ message: "Start date must be a valid ISO datetime string." })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: "End date must be a valid ISO datetime string." })
      .optional(),
    listingId: z.string().cuid({ message: "Invalid Listing ID format structure." }).optional(),
  }),
});

const popularEventsLimitSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});

module.exports = {
  dynamicRangeQuerySchema,
  popularEventsLimitSchema,
};
