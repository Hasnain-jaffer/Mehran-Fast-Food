/**
 * Stripe webhook handler.
 *
 * WHY this is the only place paymentStatus becomes 'paid': a client
 * confirming a PaymentIntent in the browser is not proof the money
 * actually settled — the client could lie, the tab could close before the
 * confirm response arrives, 3D Secure could still be pending, etc. Stripe's
 * server-to-server webhook, verified by signature, is the only source of
 * truth this app trusts for "did the charge really succeed."
 */

const { getStripe, isStripeConfigured } = require('../config/stripe');
const orderService = require('../services/order.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

const webhook = asyncHandler(async (req, res) => {
  if (!isStripeConfigured()) {
    throw new ApiError(503, 'Stripe is not configured');
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new ApiError(503, 'STRIPE_WEBHOOK_SECRET is not set — refusing to process unverifiable webhook calls.');
  }

  const stripe = getStripe();
  let event;
  try {
    // req.body must be the raw, unparsed request buffer for this to
    // verify correctly — see app.js, which mounts this route with
    // express.raw() BEFORE the global express.json() body parser.
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      await orderService.markPaymentStatusByIntentId(intent.id, 'paid');
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      await orderService.markPaymentStatusByIntentId(intent.id, 'failed');
      break;
    }
    default:
      // Other event types aren't relevant to this app — acknowledge and ignore.
      break;
  }

  res.json({ received: true });
});

module.exports = { webhook };
