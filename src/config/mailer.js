// src/config/mailer.js
//
// Nodemailer transport for Brevo (formerly Sendinblue) SMTP.
// Brevo free tier: 300 emails/day. Create a Brevo API key (SMTP key)
// and set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in the environment.

const nodemailer = require("nodemailer");
const env = require("./env");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const useSmtp = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS;

  if (!useSmtp) {
    console.warn(
      "[mailer] SMTP credentials not configured — emails will not be sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS.",
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.error("[mailer] Skipped sending email (SMTP not configured):", subject, "->", to);
    return;
  }
  try {
    await withTimeout(
      transport.sendMail({
        from: `"MapYourVibe" <${env.EMAIL_FROM}>`,
        to,
        subject,
        html,
      }),
      15000,
      "SMTP send",
    );
  } catch (err) {
    console.error("[mailer] Email send failed:", err.message);
  }
}

module.exports = { sendMail, getTransporter };
