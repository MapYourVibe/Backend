const { z } = require("zod");

const searchEventsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    category: z.string().trim().max(50).optional(),
    type: z.enum(["EVENT", "ATTRACTION"]).optional(),

    // Pagination limits to shield the DB from performance exhaustion
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),

    // Sort configuration options
    sortBy: z
      .enum(["UPCOMING", "TRENDING", "PRICE_LOW_HIGH", "PRICE_HIGH_LOW", "LATEST"])
      .default("LATEST"),
  }),
});

module.exports = {
  searchEventsSchema,
};
