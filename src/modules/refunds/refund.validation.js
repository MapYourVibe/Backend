const z = require("zod");

const createRefundSchema = z.object({
  body: z.object({
    ticketIds: z
      .array(z.string().cuid({ message: "Invalid ticket ID format." }))
      .min(1, { message: "At least one ticket must be selected." })
      .max(20, { message: "No more than 20 tickets can be refunded at once." })
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Duplicate ticket IDs are not allowed.",
      }),

    // ✅ Fixed: Aligned enums strictly with the Prisma database model to prevent runtime insertions crashes
    reason: z.enum(["USER_REQUESTED", "ORGANIZER_CANCELLED", "EVENT_CANCELLED"], {
      errorMap: () => ({ message: "Invalid refund reason." }),
    }),
  }),
});

module.exports = {
  createRefundSchema,
};
