/**
 * Rate Limiters
 * Protects against brute-force login/register attempts and general abuse.
 */

const rateLimit = require('express-rate-limit');

// Strict limiter for auth endpoints (login/register) — prevents brute-forcing
// a phone number + password combination.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' }
});

// Looser limiter applied globally to the whole API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' }
});

module.exports = { authLimiter, apiLimiter };
