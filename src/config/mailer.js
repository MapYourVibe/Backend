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
    return;
  }

  const from = env.EMAIL_FROM || "MapYourVibe <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[mailer] Resend API error:", res.status, body);
    }
  } catch (err) {
    console.error("[mailer] Email send failed:", err.message);
  }
}

module.exports = { sendMail };
