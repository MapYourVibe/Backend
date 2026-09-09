const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");
const ticketService = require("./ticket.service");

/**
 * GET /api/tickets/my
 * Get current user's tickets
 */
router.get("/my", auth, async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { order: { userId: req.user.id } },
      include: {
        orderItem: {
          include: {
            ticketType: {
              select: { name: true, listing: { select: { title: true, eventDate: true, venueName: true, city: true, bannerUrl: true } } },
            },
            capacitySlot: {
              select: { slotLabel: true, date: true, listing: { select: { title: true, venueName: true, city: true, bannerUrl: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      qrCode: t.qrCode,
      createdAt: t.createdAt,
      title: t.orderItem.ticketType?.listing?.title || t.orderItem.capacitySlot?.listing?.title || "Event",
      venue: t.orderItem.ticketType?.listing?.venueName || t.orderItem.capacitySlot?.venueName || "",
      city: t.orderItem.ticketType?.listing?.city || t.orderItem.capacitySlot?.city || "",
      eventDate: t.orderItem.ticketType?.listing?.eventDate || t.orderItem.capacitySlot?.date || null,
      bannerUrl: t.orderItem.ticketType?.listing?.bannerUrl || t.orderItem.capacitySlot?.bannerUrl || null,
      tier: t.orderItem.ticketType?.name || t.orderItem.capacitySlot?.slotLabel || "General",
    }));

    return res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/generate/:orderId
 * Generate tickets for a confirmed order
 */
router.post("/generate/:orderId", auth, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Order not found", 404);
    if (order.userId !== req.user.id && req.user.role !== "ADMIN" && req.user.role !== "OPS") {
      throw new AppError("Not authorized", 403);
    }

    const tickets = await ticketService.generateTickets({ orderId });
    return res.json({ success: true, data: tickets, message: "Tickets generated successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
