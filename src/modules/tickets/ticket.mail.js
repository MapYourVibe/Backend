// src/modules/tickets/ticket.mail.js
//
// Booking confirmation email ("your tickets are booked").
// By design the email carries NO QR codes — only the booking confirmation
// plus a link to My Tickets, where the entry QR codes live.
// (QRs stay behind login so forwarded/screenshot emails can't be reused.)
//
// Fire-and-forget by design: sendBookingConfirmationEmail() never throws.
// Email failure must never fail a payment.

const { prisma } = require("../../config/db");
const { sendMail } = require("../../config/mailer");

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatEventDate = (eventDate) => {
  if (!eventDate) return "Date to be announced";
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return "Date to be announced";
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

function buildBookingEmail({ userName, listing, orderId, totalEntries }) {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a1a2e;">Your tickets are booked! 🎉</h2>
      <p style="color:#555;line-height:1.6;">Hi ${escapeHtml(userName)},</p>
      <p style="color:#555;line-height:1.6;">Your tickets for <strong>${escapeHtml(listing.title)}</strong> are confirmed — admits ${totalEntries} ${totalEntries === 1 ? "person" : "people"}.</p>
      <div style="background:#f8f7ff;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="color:#1a1a2e;font-weight:700;margin:0 0 4px;">${escapeHtml(listing.title)}</p>
        <p style="color:#555;font-size:13px;margin:0;">${escapeHtml(listing.venueName || "")}${listing.city ? `, ${escapeHtml(listing.city)}` : ""}</p>
        <p style="color:#555;font-size:13px;margin:4px 0 0;">${escapeHtml(formatEventDate(listing.eventDate))}</p>
        <p style="color:#999;font-size:12px;margin:8px 0 0;">Order ID: ${escapeHtml(orderId)}</p>
      </div>
      <a href="https://mapyourvibe.com/tickets" style="display:block;text-align:center;background:#a855f7;color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:14px;margin:16px 0;">View My Tickets</a>
      <p style="color:#999;font-size:12px;line-height:1.6;">Your entry QR codes are on the My Tickets page — open them at the gate for check-in. Each QR works once.</p>
    </div>
  `;

  return { subject: `Your tickets are booked — ${listing.title}`, html };
}

async function sendBookingConfirmationEmail(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        listing: { select: { title: true, venueName: true, city: true, eventDate: true } },
        tickets: { select: { id: true, entriesAllowed: true } },
      },
    });

    // Guards: nothing to send to / nothing to send — skip silently.
    if (!order || !order.user?.email || !order.tickets || order.tickets.length === 0) return;
    if (!order.listing) return;

    const totalEntries = order.tickets.reduce((sum, t) => sum + (t.entriesAllowed ?? 1), 0);

    const { subject, html } = buildBookingEmail({
      userName: order.user.name || "there",
      listing: order.listing,
      orderId: order.id,
      totalEntries,
    });

    await sendMail({ to: order.user.email, subject, html });
  } catch (err) {
    // Never throw — email must not break payments.
    console.error("[booking-email] failed for order", orderId, "-", err.message);
  }
}

module.exports = { buildBookingEmail, sendBookingConfirmationEmail };
