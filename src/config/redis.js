// src/config/redis.js
//
// Single shared Redis connection, used by the inventory module for:
//   - atomic ticket/slot availability decrements (PRD Addendum Section 15.3)
//   - short-lived checkout reservation holds with TTL (Section 19.2)
//
// Using ioredis here (not the `redis` package) because its built-in
// auto-reconnect/retry behaviour and first-class Lua scripting support
// (needed for the atomic "check-and-decrement" script in the inventory
// module) are a better fit for this specific job than plain `redis`.

const Redis = require("ioredis");
const env = require("./env");

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Exponential backoff, capped at 2s, so a Redis blip doesn't hammer
    // the connection or take down the whole app trying to reconnect.
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

async function disconnectRedis() {
  await redis.quit();
}

module.exports = { redis, disconnectRedis };
