// src/middlewares/auth.middleware.js
//
// Any route that needs a logged-in user goes through this first:
//   router.get('/me', requireAuth, controller.me)
// Verifies the JWT from the httpOnly cookie, loads the real user from the
// DB (not just trusting the token payload), and attaches it as req.user.

const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { prisma } = require("../config/db");

async function requireAuth(req, res, next) {
  try {
    const token =
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : req.cookies?.token;
    if (!token) {
      throw new AppError("You must be logged in to access this", 401);
    }

    const payload = jwt.verify(token, env.JWT_SECRET);

    // Re-fetch from the DB rather than trusting the token payload alone —
    // this is what makes a role change or account deletion take effect
    // immediately, instead of only after the old token expires.
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError("Your session is no longer valid. Please log in again.", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    // Covers jwt.verify failures: expired token, tampered signature, etc.
    return next(new AppError("Your session has expired. Please log in again.", 401));
  }
}

module.exports = requireAuth;
