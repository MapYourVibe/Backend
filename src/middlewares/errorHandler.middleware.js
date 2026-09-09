// src/middlewares/errorHandler.middleware.js
//
// Mounted last in app.js. Every `next(err)` call in the app ends up here.
// Keeps internal error details (stack traces, Prisma internals) out of
// what actually gets sent to the client.

const AppError = require("../utils/AppError");

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Prisma unique-constraint violation (e.g. duplicate email slipping past
  // an explicit check due to a race) — still respond cleanly instead of a 500.
  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ success: false, message: "A record with this value already exists" });
  }

  // Anything else is an unexpected bug — log the real error server-side,
  // but never expose internals to the client.
  console.error("Unexpected error:", err);
  return res
    .status(500)
    .json({ success: false, message: "Something went wrong. Please try again." });
}

module.exports = errorHandler;
