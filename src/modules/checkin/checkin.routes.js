const router = require("express").Router();

const controller = require("./checkin.controller");

const validate = require("../../middlewares/validate.middleware");
const auth = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const { scanTicketSchema } = require("./checkin.validation");

router.post(
  "/scan",
  auth,
  authorize("ORGANIZER", "ADMIN"),
  validate(scanTicketSchema),
  controller.scanTicket,
);

module.exports = router;
