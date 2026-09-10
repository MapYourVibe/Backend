// src/modules/auth/auth.service.js
//
// All the actual logic lives here. The controller just parses req/res and
// calls into this — nothing here knows about Express at all, which makes
// it directly testable and reusable (e.g. an admin-created-organizer flow
// later can reuse issueToken/sanitizeUser without touching HTTP at all).

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../../config/db");
const env = require("../../config/env");
const { sendMail } = require("../../config/mailer");
const AppError = require("../../utils/AppError");
const {
  generateOtp,
  hashOtp,
  verifyOtp,
  isExpired,
  OTP_TTL_MS,
  MAX_ATTEMPTS,
} = require("../../utils/otp");

const SALT_ROUNDS = 10;

async function signup({ name, email, phone, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.emailVerified) {
      throw new AppError("An account with this email already exists", 409);
    }

    // Account exists but email not verified — let them retry: update
    // credentials and resend the OTP so the flow can continue.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, phone: phone ?? existing.phone },
    });

    sendVerificationOtp(user).catch(() => {});

    return { user: sanitizeUser(user) };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role: "USER", emailVerified: false },
  });

  // Fire-and-forget the verification OTP — never block signup on mailer latency.
  sendVerificationOtp(user).catch(() => {});

  const token = issueToken(user);
  return { user: sanitizeUser(user), token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error message whether the email doesn't exist or the password is
  // wrong — on purpose. Distinguishing the two lets an attacker enumerate
  // which emails have accounts on the platform.
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.emailVerified) {
    throw new AppError(
      "Please verify your email first. Check your inbox for a 6-digit code to activate your account.",
      403,
    );
  }

  const token = issueToken(user);
  return { user: sanitizeUser(user), token };
}

function issueToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// Strips passwordHash before a user object ever goes into a response or a
// JWT payload — never trust a call site downstream to remember to do this.
function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function buildOtpExpiry() {
  return new Date(Date.now() + OTP_TTL_MS);
}

// Shared OTP email sender. Used for both email verification and password reset.
async function sendOtpEmail({ to, name, subject, purpose }) {
  const otp = generateOtp();
  await sendMail({
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a2e;">${subject}</h2>
        <p style="color:#555;line-height:1.6;">Hi ${name},</p>
        <p style="color:#555;line-height:1.6;">${purpose}</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#a855f7;margin:24px 0;text-align:center;">${otp}</p>
        <p style="color:#999;font-size:12px;line-height:1.6;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
  return otp;
}

async function sendVerificationOtp(user) {
  const otp = await sendOtpEmail({
    to: user.email,
    name: user.name,
    subject: "Verify your MapYourVibe account",
    purpose: "Your one-time verification code is below.",
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailOtpHash: await hashOtp(otp),
      emailOtpExpiresAt: buildOtpExpiry(),
      otpAttempts: 0,
    },
  });
}

async function verifyEmail({ email, otp }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid or expired verification code", 400);
  if (user.emailVerified) return { user: sanitizeUser(user) };

  if (isExpired(user.emailOtpExpiresAt)) {
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }
  if (user.otpAttempts >= MAX_ATTEMPTS) {
    throw new AppError("Too many failed attempts. Please request a new code.", 400);
  }

  const matches = await verifyOtp(otp, user.emailOtpHash);
  if (!matches) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpAttempts: { increment: 1 } },
    });
    throw new AppError("Invalid verification code", 400);
  }

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailOtpHash: null, emailOtpExpiresAt: null, otpAttempts: 0 },
  });
  return { user: sanitizeUser(verified) };
}

async function resendVerification({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return;
  await sendVerificationOtp(user);
}

async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Always succeed to avoid email enumeration

  const otp = await sendOtpEmail({
    to: user.email,
    name: user.name,
    subject: "Reset your MapYourVibe password",
    purpose: "Use this code to reset your password.",
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetOtpHash: await hashOtp(otp),
      resetOtpExpiresAt: buildOtpExpiry(),
      otpAttempts: 0,
    },
  });
}

async function resetPassword({ email, otp, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid or expired reset code", 400);

  if (isExpired(user.resetOtpExpiresAt)) {
    throw new AppError("Reset code has expired. Please request a new one.", 400);
  }
  if (user.otpAttempts >= MAX_ATTEMPTS) {
    throw new AppError("Too many failed attempts. Please request a new code.", 400);
  }

  const matches = await verifyOtp(otp, user.resetOtpHash);
  if (!matches) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpAttempts: { increment: 1 } },
    });
    throw new AppError("Invalid or expired reset code", 400);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetOtpHash: null, resetOtpExpiresAt: null, otpAttempts: 0 },
  });
}

module.exports = {
  signup,
  login,
  issueToken,
  sanitizeUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
