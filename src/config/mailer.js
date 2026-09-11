// src/config/mailer.js
//
// Resend HTTP API mailer. Replaces the previous Brevo SMTP transport which
// was blocked by Railway's outbound port restrictions. Resend uses HTTPS
// so it works on all Railway plans.

const env = require("./env");

async function sendMail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[mailer] RESEND_API_KEY not set — email not sent:", subject, "->", to);
    throw new Error("RESEND_API_KEY not configured");
  }

  const from = (process.env.EMAIL_FROM || env.EMAIL_FROM || "no-reply@mapyourvibe.com").trim();
  console.log("[mailer] Sending email:", { from, to, subject });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const body = await res.text().catch(() => "");
  console.log("[mailer] Resend response:", res.status, body);

  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

module.exports = { sendMail };
