const { z } = require("zod");

const performancePeriodSchema = z.object({
  query: z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
  }),
});

module.exports = {
  performancePeriodSchema,
};
