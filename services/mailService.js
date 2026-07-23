/**
 * services/mailService.js
 * ------------------------------------------------------------
 * Sends transactional email via SMTP (Hostinger by default)
 * using nodemailer, with a shared branded HTML template.
 *
 *   MAIL_HOST  e.g. smtp.hostinger.com
 *   MAIL_PORT  465 (SSL) or 587 (TLS)
 *   MAIL_USER  full mailbox address
 *   MAIL_PASS  mailbox password
 *   MAIL_FROM  "from" address (defaults to MAIL_USER)
 *
 * Exposes: sendPasswordReset, sendWelcome, sendLoginAlert.
 * ------------------------------------------------------------
 */

const nodemailer = require("nodemailer");

const BRAND = "Priyanshu's Blog";
const TEAL = "#0f766e";

function getTransporter() {
  const port = Number(process.env.MAIL_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.hostinger.com",
    port,
    secure: port === 465, // SSL on 465, STARTTLS on 587
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

/* A reusable, email-client-safe HTML layout (inline styles). */
function layout({ heading, preheader = "", bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f1ea;font-family:Arial,Helvetica,sans-serif;color:#16201c;">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ea;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="text-align:center;padding:0 0 18px;">
          <span style="font-size:20px;font-weight:bold;color:${TEAL};letter-spacing:-.3px;">&#9670; ${BRAND}</span>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e3ddd0;border-radius:16px;overflow:hidden;">
          <div style="background:${TEAL};background:linear-gradient(135deg,#0f766e,#14b8a6);padding:24px 30px;">
            <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:bold;">${heading}</h1>
          </div>
          <div style="padding:28px 30px;font-size:15px;line-height:1.65;color:#26302b;">
            ${bodyHtml}
          </div>
        </td></tr>
        <tr><td style="text-align:center;color:#5b6470;font-size:12px;line-height:1.6;padding:18px 10px 0;">
          ${BRAND} — AI-powered blog platform &middot; BCA Final-Semester Project (BCSP-064)<br>
          This is an automated message regarding your account.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td align="center"
    style="border-radius:999px;background:${TEAL};background:linear-gradient(135deg,#0f766e,#14b8a6);">
    <a href="${href}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;border-radius:999px;">${label}</a>
  </td></tr></table>`;
}

async function send(to, subject, html) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `${BRAND} <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}

/* ---------- Password reset ---------- */
async function sendPasswordReset(to, name, link) {
  const body = `
    <p>Hi ${name || "there"},</p>
    <p>We received a request to reset the password for your <strong>${BRAND}</strong> account. Click the button below to choose a new password. For your security, this link is valid for <strong>1 hour</strong> and can be used only once.</p>
    ${button(link, "Set a new password")}
    <p style="font-size:13px;color:#5b6470;">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${link}" style="color:${TEAL};word-break:break-all;">${link}</a></p>
    <p style="font-size:13px;color:#5b6470;margin-top:18px;">Didn't request this? You can safely ignore this email &mdash; your password won't change.</p>`;
  await send(
    to,
    `Reset your password — ${BRAND}`,
    layout({
      heading: "Reset your password",
      preheader: "Reset your password (link valid 1 hour).",
      bodyHtml: body,
    }),
  );
}

/* ---------- Welcome (on register) ---------- */
async function sendWelcome(to, name, siteUrl) {
  const body = `
    <p>Hi ${name || "there"},</p>
    <p>Welcome to <strong>${BRAND}</strong> &mdash; your account is ready. You can now publish content in two ways:</p>
    <ul style="margin:0 0 16px 18px;padding:0;">
      <li style="margin-bottom:6px;"><strong>Generate with AI</strong> &mdash; turn a single topic into a complete, SEO-ready article in seconds.</li>
      <li><strong>Write manually</strong> &mdash; craft and format your own posts in the rich-text editor.</li>
    </ul>
    <p>Every article you publish is automatically optimised for search engines.</p>
    ${button(siteUrl + "/dashboard", "Go to your dashboard")}
    <p style="font-size:13px;color:#5b6470;">Happy writing!</p>`;
  await send(
    to,
    `Welcome to ${BRAND}!`,
    layout({
      heading: `Welcome aboard, ${name ? name.split(" ")[0] : "writer"}!`,
      preheader: "Your account is ready.",
      bodyHtml: body,
    }),
  );
}

/* ---------- Login alert (on login) ---------- */
async function sendLoginAlert(to, name, opts = {}) {
  const time = opts.time || new Date().toLocaleString();
  const ip = opts.ip || "Unknown";
  const device = opts.device || "Unknown";
  const siteUrl = opts.siteUrl || "";
  const body = `
    <p>Hi ${name || "there"},</p>
    <p>We're letting you know that your <strong>${BRAND}</strong> account was just signed in to.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:14px 0;border-collapse:collapse;">
      <tr><td style="padding:8px 12px;background:#f3f1ea;border-radius:8px 0 0 8px;color:#5b6470;font-size:13px;width:90px;">Time</td>
          <td style="padding:8px 12px;background:#f7f6f1;border-radius:0 8px 8px 0;font-size:13px;">${time}</td></tr>
      <tr><td style="height:6px;"></td><td></td></tr>
      <tr><td style="padding:8px 12px;background:#f3f1ea;border-radius:8px 0 0 8px;color:#5b6470;font-size:13px;">Device</td>
          <td style="padding:8px 12px;background:#f7f6f1;border-radius:0 8px 8px 0;font-size:13px;">${device}</td></tr>
      <tr><td style="height:6px;"></td><td></td></tr>
      <tr><td style="padding:8px 12px;background:#f3f1ea;border-radius:8px 0 0 8px;color:#5b6470;font-size:13px;">IP</td>
          <td style="padding:8px 12px;background:#f7f6f1;border-radius:0 8px 8px 0;font-size:13px;">${ip}</td></tr>
    </table>
    <p style="font-size:13px;color:#5b6470;">If this was you, no action is needed. If you don't recognise this sign-in, please reset your password immediately.</p>
    ${button(siteUrl + "/login", "Review my account")}`;
  await send(
    to,
    `New sign-in to your ${BRAND} account`,
    layout({
      heading: "New sign-in detected",
      preheader: "A new sign-in to your account.",
      bodyHtml: body,
    }),
  );
}

module.exports = { sendPasswordReset, sendWelcome, sendLoginAlert };
