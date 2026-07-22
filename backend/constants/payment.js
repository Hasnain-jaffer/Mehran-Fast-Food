/**
 * Payment / checkout constants.
 *
 * WHY centralized: delivery fee and minimum order amount previously didn't
 * exist at all — orders always totaled exactly the sum of their items.
 * Reading them from env (with sane defaults) means the shop owner can
 * change them via .env without touching code or redeploying app logic,
 * and both the order-creation path and the public checkout-info endpoint
 * (so the cart page can display/enforce them before submitting) read the
 * same single source of truth.
 */

const PAYMENT_METHODS = Object.freeze(['COD', 'card']);
const PAYMENT_STATUSES = Object.freeze(['pending', 'paid', 'failed', 'refunded']);

const DELIVERY_FEE = Number(process.env.DELIVERY_FEE) >= 0 ? Number(process.env.DELIVERY_FEE) : 100;
const MIN_ORDER_AMOUNT = Number(process.env.MIN_ORDER_AMOUNT) >= 0 ? Number(process.env.MIN_ORDER_AMOUNT) : 300;

// Stripe's presentment currency code — lowercase, as their API expects.
const STRIPE_CURRENCY = 'pkr';

module.exports = { PAYMENT_METHODS, PAYMENT_STATUSES, DELIVERY_FEE, MIN_ORDER_AMOUNT, STRIPE_CURRENCY };
