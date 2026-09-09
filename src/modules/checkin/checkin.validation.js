const { z } = require("zod");

const scanTicketSchema = z.object({
  body: z.object({
    ticketNumber: z.string().min(1),
  }),
});

module.exports = {
  scanTicketSchema,
};
