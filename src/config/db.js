// src/config/db.js
//
// Single shared Prisma Client instance for the whole app.
//
// Why a singleton: creating a `new PrismaClient()` per request (or per file
// that imports it) opens a new connection pool each time — that's exactly
// the "connections exhaust before CPU does" failure mode from PRD Addendum
// Section 19.1. One instance, reused everywhere, is what actually lets
// Supabase's pooler (Supavisor) do its job.

const { PrismaClient } = require("@prisma/client");
const env = require("./env");

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// In development, Node's module cache can be cleared on hot-reload, which
// would otherwise spawn a fresh PrismaClient (and a fresh connection pool)
// on every file save. Stashing it on `globalThis` survives the reload.
if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

async function connectDb(retries = 5, baseDelayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log("✅ Connected to Postgres (via Supabase pooled connection)");
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️  DB connection attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function disconnectDb() {
  await prisma.$disconnect();
}

module.exports = { prisma, connectDb, disconnectDb };
