const { z } = require("zod");

const sendTestNotificationSchema = z.object({
  body: z.object({
    userId: z.string().cuid({ message: "Invalid Target User ID format." }),
    channel: z.enum(["EMAIL", "SMS", "PUSH", "ALL"], {
      errorMap: () => ({ message: "Channel must be EMAIL, SMS, PUSH, or ALL." }),
    }),
    subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
    message: z.string().trim().min(5, "Message payload too short"),
  }),
});

module.exports = {
  sendTestNotificationSchema,
};
