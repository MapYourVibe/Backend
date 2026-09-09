// src/utils/AppError.js
//
// Use this for any "expected" error — wrong password, duplicate email,
// not found, no permission, etc. The error handler middleware checks
// `isOperational` to tell these apart from real bugs: an AppError becomes
// a clean JSON response with the message you wrote; anything else becomes
// a generic "Something went wrong" so internal details never leak to users.

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
