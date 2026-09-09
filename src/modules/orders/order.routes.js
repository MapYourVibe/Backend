const express = require("express");

const router = express.Router();

const orderController = require("./order.controller");
const { createOrderSchema, listOrdersQuerySchema } = require("./order.validation");

const validate = require("../../middlewares/validate.middleware");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");

router.post("/", requireAuth, validate(createOrderSchema), orderController.createOrder);
router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  validate(listOrdersQuerySchema),
  orderController.listOrders,
);

module.exports = router;
