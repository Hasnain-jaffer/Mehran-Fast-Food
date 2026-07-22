/**
 * Stripe client, initialized lazily.
 *
 * WHY lazy/optional rather than a REQUIRED_VARS entry in config/env.js:
 * this is a fast food shop's first-ever online payment method, launching
 * alongside a Cash on Delivery option that already works fine. There's no
 * reason a missing/not-yet-issued Stripe key should stop the whole server
 * (and COD checkout) from starting. `isStripeConfigured()` lets callers
 * check before offering the card option, and getStripe() throws a clear
 * ApiError if something tries to use it anyway.
 */

const { ApiError } = require('../utils/ApiError');

let stripeClient = null;
let attempted = false;

function isStripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== '');
}

function getStripe() {
  if (!isStripeConfigured()) {
    throw new ApiError(503, 'Card payments are not configured on this server yet.');
  }
  if (!attempted) {
    attempted = true;
    // Required lazily so a missing `stripe` package (e.g. before `npm
    // install` picks up the new dependency) doesn't crash server startup —
    // only the first attempt to actually use it.
    const Stripe = require('stripe');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

module.exports = { getStripe, isStripeConfigured };
