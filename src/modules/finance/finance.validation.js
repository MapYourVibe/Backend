const { z } = require("zod");

/**
 * Validates the payload when an organizer requests a manual payout settlement.
 */
const requestPayoutSchema = z.object({
  body: z.object({
    amountInPaise: z.coerce
      .number()
      .int({ message: "Payout amount must be a whole integer in paise." })
      .positive({ message: "Payout amount must be greater than zero." })
      .min(100, { message: "Minimum structural payout request is ₹1.00 (100 paise)." }),
  }),
});

/**
 * Validates the inputs when a platform administrator updates or overrides a payout lifecycle status.
 */
const adminResolvePayoutSchema = z.object({
  params: z.object({
    payoutId: z.string().cuid({ message: "Invalid Payout ID format." }),
  }),
  body: z.object({
    status: z.enum(["PENDING", "PROCESSING", "RELEASED", "FAILED"], {
      errorMap: () => ({
        message:
          "Invalid operational payout resolution status. Choose between PENDING, PROCESSING, RELEASED, or FAILED.",
      }),
    }),
  }),
});

module.exports = {
  requestPayoutSchema,
  adminResolvePayoutSchema,
};
