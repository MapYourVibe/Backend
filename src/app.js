// src/app.js

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const env = require("./config/env");

// Constant-time string compare so the proxy-secret check doesn't leak timing.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Route Imports
const authRoutes = require("./modules/auth/auth.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const orderRoutes = require("./modules/orders/order.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const checkinRoutes = require("./modules/checkin");
const financeRoutes = require("./modules/finance/finance.routes");
const userRoutes = require("./modules/users/user.routes");
const organizerRoutes = require("./modules/organizers/organizer.routes");
const venueRoutes = require("./modules/venues/venue.routes");
const eventRoutes = require("./modules/events/event.routes");
const searchRoutes = require("./modules/search/search.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const dashboardRoutes = require("./modules/dashboards/dashboard.routes");
const uploadRoutes = require("./modules/upload/upload.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const couponRoutes = require("./modules/coupons/coupon.routes");
const reviewsRoutes = require("./modules/reviews/reviews.routes");
const leadRoutes = require("./modules/leads/leads.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const refundRoutes = require("./modules/refunds");
const ticketRoutes = require("./modules/tickets");

const errorHandler = require("./middlewares/errorHandler.middleware");

const app = express();

// Global Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [
      "https://mapyourvibe.com",
      "https://www.mapyourvibe.com",
      "https://mapyourvibe.in",
      "https://www.mapyourvibe.in",
      "https://mapyourvibe.online",
      "https://www.mapyourvibe.online",
      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:8081",
    ],
    credentials: true,
  }),
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8"); // CRUCIAL: Retained to keep Razorpay webhook signature parsing happy
    },
  }),
);

app.use(cookieParser());

// Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  // *Never* blindly trust the `cf-connecting-ip` header: anyone can send one and
  // reset their own rate-limit bucket. Only honor it when the request carries the
  // shared secret that ONLY the Cloudflare Worker proxy knows (x-my-proxy-secret),
  // which is how the Worker forwards the real browser IP to us. Every other caller
  // is keyed on the socket-derived `req.ip` (which, because Railway fronts the
  // app, is the Railway edge IP for direct callers — still the correct unit for
  // rate limiting since one egress maps to one client cluster).
  //
  // PROXY_SECRET not set yet (pre-configuration): keep the legacy behavior
  // (`cf-connecting-ip || req.ip`) so an in-between deploy never collapses all
  // proxied traffic onto one shared bucket — the hardening activates the moment
  // PROXY_SECRET is added to the environment.
  keyGenerator: (req) => {
    const secret = env.PROXY_SECRET;
    if (!secret) return req.headers["cf-connecting-ip"] || req.ip;
    const proxyOk =
      req.headers["x-my-proxy-secret"] &&
      safeEqual(secret, req.headers["x-my-proxy-secret"]);
    return proxyOk ? req.headers["cf-connecting-ip"] || req.ip : req.ip;
  },
});
app.use("/api", apiLimiter);

// Health Check Route
app.get("/health", (req, res) => res.json({ status: "ok" }));

// API Route Mounts
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewsRoutes);
// 🔽 NEW ADDITION: Mount the elevated administration namespace
app.use("/api/leads", leadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/check-in", checkinRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/tickets", ticketRoutes);

// Fallback 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized Error Handling Middleware (Must be mounted absolutely last)
app.use(errorHandler);

module.exports = app;
