/**
 * Shared Stripe.js instance. `loadStripe` is safe to call even without a
 * key configured — it just resolves to null, which components check for
 * before offering the card payment option.
 */
import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
