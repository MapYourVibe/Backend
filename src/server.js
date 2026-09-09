// src/server.js

const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");
const { sweepExpiredReservations } = require("./modules/inventory/inventory.service");
const { RESERVATION_SWEEP_INTERVAL_MS } = require("./config/constants");

async function start() {
  await connectDb(); // fail fast on boot if the DB is unreachable, rather
  // than accepting requests and failing per-request
  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`);
  });

  // Safety-net sweep: releases any checkout hold that timed out without
  // being explicitly confirmed or cancelled (PRD Addendum Section 15.3).
  // The atomic Redis decrement at reserve-time is what actually prevents
  // overselling — this sweep just gives the inventory back to the pool.
  setInterval(async () => {
    try {
      const released = await sweepExpiredReservations();
      if (released > 0) {
        console.log(`🧹 Released ${released} expired reservation(s)`);
      }
    } catch (err) {
      console.error("Reservation sweep failed:", err);
    }
  }, RESERVATION_SWEEP_INTERVAL_MS);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
