const express = require("express");
const router = express.Router();

const leadController = require("./leads.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const { createLeadSchema, adminUpdateLeadSchema } = require("./leads.validation");

router.post("/", validate(createLeadSchema), leadController.createLead);

router.get("/admin", requireAuth, requireRole("ADMIN", "OPS"), leadController.listLeads);
router.patch("/admin/:id", requireAuth, requireRole("ADMIN", "OPS"), validate(adminUpdateLeadSchema), leadController.adminUpdateLead);

module.exports = router;
