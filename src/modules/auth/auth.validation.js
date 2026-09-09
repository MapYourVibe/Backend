// src/modules/auth/auth.validation.js

const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(10).max(15).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  otp: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  otp: z.string().regex(/^\d{6}$/, "Reset code must be 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  resetPasswordSchema,
};
