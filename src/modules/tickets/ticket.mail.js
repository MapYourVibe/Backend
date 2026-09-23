// src/modules/tickets/ticket.mail.js
//
// Booking confirmation email ("your tickets are booked") with tickets inline.
// QR images encode the ticket NUMBER only — that is exactly what
// POST /api/check-in/scan expects as `ticketNumber`.
//
// Fire-and-forget by design: sendBookingConfirmationEmail() never throws.
// Email failure must never fail a payment.

const { prisma } = require("../../config/db");
const { sendMail } = require("../../config/mailer");
const QRCode = require("qrcode");

// NOTE: QR encodes the raw ticket-number string (no JSON wrapper).
// /scan decodes the QR text and posts it verbatim as `ticketNumber`,
// so the encoded content must equal the DB ticketNumber exactly.
// (qr.service.generateQrDataUrl JSON-stringifies its input, which would
// add literal quote characters and break the lookup — hence direct use.)
const generateTicketQrDataUrl = (ticketNumber) =>
  QRCode.toDataURL(ticketNumber, { width: 300, margin: 2 });

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

function buildBookingEmail({ userName, listing, orderId, tickets }) {
  const ticketBlocks = tickets
    .map(
      (t, i) => `
        <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
          <p style="color:#1a1a2e;font-weight:700;margin:0 0 4px;">${escapeHtml(t.tierName)} entry — admits ${t.entriesAllowed}</p>
          <p style="color:#555;font-size:13px;margin:0 0 12px;letter-spacing:1px;">${escapeHtml(t.ticketNumber)}</p>
          <img src="${t.qrDataUrl}" alt="Ticket QR ${i + 1}" width="180" height="180" style="display:block;margin:0 auto;" />
          <p style="color:#999;font-size:12px;margin:12px 0 0;">Single scan at the gate for all ${t.entriesAllowed} ${t.entriesAllowed === 1 ? "person" : "people"}.</p>
        </div>
      `,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a1a2e;">Your tickets are booked! 🎉</h2>
      <p style="color:#555;line-height:1.6;">Hi ${escapeHtml(userName)},</p>
      <p style="color:#555;line-height:1.6;">Your tickets for <strong>${escapeHtml(listing.title)}</strong> are confirmed.</p>
      <div style="background:#f8f7ff;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="color:#1a1a2e;font-weight:700;margin:0 0 4px;">${escapeHtml(listing.title)}</p>
        <p style="color:#555;font-size:13px;margin:0;">${escapeHtml(listing.venueName || "")}${listing.city ? `, ${escapeHtml(listing.city)}` : ""}</p>
        <p style="color:#555;font-size:13px;margin:4px 0 0;">${escapeHtml(formatEventDate(listing.eventDate))}</p>
        <p style="color:#999;font-size:12px;margin:8px 0 0;">Order ID: ${escapeHtml(orderId)}</p>
      </div>
      ${ticketBlocks}
      <a href="https://mapyourvibe.com/tickets" style="display:block;text-align:center;background:#a855f7;color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:14px;margin:16px 0;">View My Tickets</a>
      <p style="color:#999;font-size:12px;line-height:1.6;">Show the QR at entry for check-in. Each QR works once.</p>
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
        items: { include: { ticketType: { select: { name: true } } } },
        tickets: { orderBy: { createdAt: "asc" } },
      },
    });

    // Guards: nothing to send to / nothing to send — skip silently.
    if (!order || !order.user?.email || !order.tickets || order.tickets.length === 0) return;
    if (!order.listing) return;

    const itemById = new Map((order.items || []).map((it) => [it.id, it]));

    const tickets = [];
    for (const t of order.tickets) {
      const item = itemById.get(t.orderItemId);
      const tierName = item?.ticketType?.name || item?.ticketName || "General";
      const entriesAllowed = t.entriesAllowed ?? item?.quantity ?? 1;
      // QR encodes the ticket number only — matches /api/check-in/scan input.
      const qrDataUrl = await generateTicketQrDataUrl(t.ticketNumber);
      tickets.push({ ticketNumber: t.ticketNumber, tierName, entriesAllowed, qrDataUrl });
    }

    const { subject, html } = buildBookingEmail({
      userName: order.user.name || "there",
      listing: order.listing,
      orderId: order.id,
      tickets,
    });

    await sendMail({ to: order.user.email, subject, html });
  } catch (err) {
    // Never throw — email must not break payments.
    console.error("[booking-email] failed for order", orderId, "-", err.message);
  }
}

module.exports = { buildBookingEmail, sendBookingConfirmationEmail };
