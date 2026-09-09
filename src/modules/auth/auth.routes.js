// src/modules/auth/auth.routes.js

const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../middlewares/validate.middleware");
const requireAuth = require("../../middlewares/auth.middleware");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} = require("./auth.validation");

const router = express.Router();

router.post("/signup", validate(signupSchema), controller.signup);
router.post("/login", validate(loginSchema), controller.login);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);
router.post("/forgot-password", validate(forgotPasswordSchema), controller.forgotPassword);
router.post("/verify-email", validate(verifyEmailSchema), controller.verifyEmail);
router.post("/resend-verification", validate(resendVerificationSchema), controller.resendVerification);
router.post("/reset-password", validate(resetPasswordSchema), controller.resetPassword);

module.exports = router;
