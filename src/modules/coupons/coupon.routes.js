const express = require("express");
const router = express.Router();

const couponController = require("./coupon.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");

const { createCouponSchema, validateCouponSchema } = require("./coupon.validation");

// Public/Authenticated User Operational Path: Validate discounts during checkout sequences
router.post(
  "/validate",
  requireAuth,
  validate(validateCouponSchema),
  couponController.validateCouponCode,
);

// Administrative Path: Creation vectors guarded under elevated security profiles
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "ORGANIZER"),
  validate(createCouponSchema),
  couponController.createNewCoupon,
);

module.exports = router;
