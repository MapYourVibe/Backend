// src/modules/auth/auth.controller.js

const authService = require("./auth.service");
const { success } = require("../../utils/apiResponse");
const env = require("../../config/env");

// httpOnly so client-side JS can never read the token (XSS protection).
// domain is set to COOKIE_DOMAIN (e.g. ".yourbrand.com") only in production
// so the organizer/admin subdomains share this same session cookie — see
// PRD Addendum Section 16 for why that matters.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  domain: env.NODE_ENV === "production" ? env.COOKIE_DOMAIN : undefined,
  maxAge: 36 * 60 * 60 * 1000, // 36 hours
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  domain: env.NODE_ENV === "production" ? env.COOKIE_DOMAIN : undefined,
};

async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.body);
    const { user } = result;
    const token = result.token ?? null;
    // Don't auto-login: account must be email-verified before the token is usable.
    if (token && user.emailVerified) {
      res.cookie("token", token, COOKIE_OPTIONS);
    }
    return success(res, { data: { user, token }, message: "Account created successfully. Check your email for a verification code.", statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie("token", token, COOKIE_OPTIONS);
    return success(res, { data: { user, token }, message: "Logged in successfully" });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie("token", CLEAR_COOKIE_OPTIONS);
  return success(res, { message: "Logged out successfully" });
}

async function me(req, res, next) {
  try {
    // Re-fetch from DB so role changes (e.g. USER → VENUE_OWNER) are picked up
    const { prisma } = require("../../config/db");
    const freshUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!freshUser) {
      res.clearCookie("token", CLEAR_COOKIE_OPTIONS);
      return success(res, { data: { user: null } });
    }
    const token = authService.issueToken(freshUser);
    res.cookie("token", token, COOKIE_OPTIONS);
    const { passwordHash, ...safeUser } = freshUser;
    return success(res, { data: { user: safeUser, token } });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body);
    return success(res, { message: "If an account exists with that email, a reset code has been sent." });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { user } = await authService.verifyEmail(req.body);
    // Now verified → issue the session cookie so the account activates immediately.
    const token = authService.issueToken(user);
    res.cookie("token", token, COOKIE_OPTIONS);
    return success(res, { data: { user, token }, message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    await authService.resendVerification(req.body);
    return success(res, { message: "If an account exists with that email, a new verification code has been sent." });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body);
    return success(res, { message: "Password has been reset successfully. You can now sign in." });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, me, forgotPassword, verifyEmail, resendVerification, resetPassword };
