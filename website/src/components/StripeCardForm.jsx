/**
 * StripeCardForm - collects card details via Stripe Elements and confirms
 * the PaymentIntent for an already-created (paymentStatus: 'pending') order.
 *
 * Card details never touch our backend or even our own frontend code —
 * Stripe's CardElement is an iframe that hands Stripe.js a token directly,
 * which is what PCI compliance actually requires here.
 */
import { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../utils/stripe';
import { Loader2, Lock } from 'lucide-react';

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a1a',
      '::placeholder': { color: '#9b9b9b' }
    },
    invalid: { color: '#e02424' }
  }
};

function CardFormInner({ clientSecret, onSuccess, onError, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });

    setSubmitting(false);

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please check your card details and try again.');
      onError?.(confirmError);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess?.();
    } else {
      setError('Payment did not complete. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border border-mehran-surface-variant/30 rounded-lg bg-white">
        <CardElement options={cardElementOptions} />
      </div>
      {error && <p className="text-sm text-mehran-error">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {submitting ? 'Processing...' : `Pay Rs. ${amount}`}
      </button>
      <p className="text-center text-xs text-mehran-on-surface-variant flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Payments are handled securely by Stripe
      </p>
    </form>
  );
}

export default function StripeCardForm(props) {
  return (
    <Elements stripe={stripePromise}>
      <CardFormInner {...props} />
    </Elements>
  );
}
