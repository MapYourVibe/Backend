// src/modules/inventory/inventory.routes.js

const express = require("express");
const controller = require("./inventory.controller");
const validate = require("../../middlewares/validate.middleware");
const requireAuth = require("../../middlewares/auth.middleware");
const { reserveSchema } = require("./inventory.validation");

const router = express.Router();

// Public — listing page can show live inventory
router.get("/:entityType/:entityId", controller.getAvailability);

// Authenticated routes
router.post("/reserve", requireAuth, validate(reserveSchema), controller.reserve);

router.post("/:reservationId/confirm", requireAuth, controller.confirm);

router.post("/:reservationId/release", requireAuth, controller.release);

module.exports = router;
