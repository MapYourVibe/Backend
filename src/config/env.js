// src/config/env.js
//
// Loads and validates all required environment variables at startup.
// If anything required is missing/malformed, the app fails fast here —
// not three requests later with a confusing runtime error.

require("dotenv").config();
const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // Supabase Postgres — DATABASE_URL is the pooled connection (port 6543,
  // ?pgbouncer=true) that the running app uses for every query.
  // DIRECT_URL is the unpooled connection (port 5432) that `prisma migrate`
  // uses — migrations need a direct connection because the transaction-mode
  // pooler doesn't support the prepared statements Prisma Migrate relies on.
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Redis — used for atomic inventory decrements and checkout reservation
  // holds (PRD Addendum Section 15.3 / 19.2). A managed instance (Upstash,
  // Redis Cloud) is fine; self-hosted works too.
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET should be at least 32 characters")
    .refine((v) => v !== "replace-with-a-random-32+-character-secret", {
      message: "JWT_SECRET must not be the placeholder default. Generate a real random value.",
    }),
  JWT_EXPIRES_IN: z.string().default("36h"),
  COOKIE_DOMAIN: z.string().default("localhost"), // set to ".yourbrand.com" in production so the
  // organizer/admin subdomains share the session

  // Shared secret between the Cloudflare Worker proxy and this backend. When the
  // Worker forwards the real client IP in `cf-connecting-ip`, it also sends this
  // secret in `x-my-proxy-secret`. Only then is `cf-connecting-ip` trusted for
  // rate-limit keying; otherwise a caller could spoof the header to reset its
  // own rate limit. Direct (non-Worker) callers fall back to `req.ip`.
  PROXY_SECRET: z.string().optional(),

  // Payments
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Media
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  // Email — Resend HTTP API. Set EMAIL_FROM to a verified domain address
  // (e.g. "no-reply@mapyourvibe.com"). Falls back to Resend's default sandbox.
  EMAIL_FROM: z.string().email().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
