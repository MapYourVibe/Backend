// src/utils/otp.js
//
// Shared OTP helpers for email verification and password reset.
// OTPs are 6-digit, cryptographically random, and stored HASHED (bcrypt)
// — never in plaintext.

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function hashOtp(raw) {
  return bcrypt.hash(raw, 8);
}

async function verifyOtp(raw, hashed) {
  if (!hashed) return false;
  return bcrypt.compare(raw, hashed);
}

function isExpired(expiresAt) {
  return !expiresAt || expiresAt.getTime() < Date.now();
}

module.exports = { generateOtp, hashOtp, verifyOtp, isExpired, OTP_TTL_MS, MAX_ATTEMPTS };