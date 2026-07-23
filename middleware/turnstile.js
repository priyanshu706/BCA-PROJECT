/**
 * middleware/turnstile.js
 * ------------------------------------------------------------
 * Verifies a Cloudflare Turnstile token on form submissions.
 *
 * The widget puts a token in the "cf-turnstile-response" field;
 * this middleware validates it against Cloudflare's siteverify
 * endpoint using TURNSTILE_SECRET_KEY.
 *
 * If TURNSTILE_SECRET_KEY is not set, verification is skipped,
 * so the app still runs in local development without keys.
 * ------------------------------------------------------------
 */

const axios = require('axios');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstile(req, res, next) {
  let secret = process.env.TURNSTILE_SECRET_KEY;
  try {
    const { getEffectiveSettings } = require("../services/settingsService");
    secret = (await getEffectiveSettings()).turnstileSecretKey || secret;
  } catch (e) { /* fall back to env */ }
  if (!secret) return next(); // not configured → skip

  const token = req.body['cf-turnstile-response'];
  const back = req.get('Referer') || '/login';

  if (!token) {
    req.flash('error', 'Please complete the verification challenge.');
    return res.redirect(back);
  }

  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (ip) params.append('remoteip', ip);

    const { data } = await axios.post(VERIFY_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });

    if (data && data.success) return next();

    req.flash('error', 'Verification failed. Please try again.');
    return res.redirect(back);
  } catch (err) {
    console.error('Turnstile verify error:', err.message);
    req.flash('error', 'Could not verify the challenge. Please try again.');
    return res.redirect(back);
  }
}

module.exports = { verifyTurnstile };