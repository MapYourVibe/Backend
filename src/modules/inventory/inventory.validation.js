const { z } = require("zod");

const reserveSchema = z.object({
  entityType: z.enum(["TICKET_TYPE", "CAPACITY_SLOT"]),
  // Hardened validation to guarantee incoming entities match database schema patterns
  entityId: z.string().cuid({ message: "Invalid entity ID format." }),
  quantity: z.coerce.number().int().min(1).max(20, "Maximum 20 tickets per reservation"),
});

module.exports = { reserveSchema };
