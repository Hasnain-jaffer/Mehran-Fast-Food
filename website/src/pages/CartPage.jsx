/**
 * CartPage - Review cart, edit quantities, place order
 */

import { useState, useEffect } from 'react';
import { useCart, getLineKey } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import StripeCardForm from '../components/StripeCardForm';
import { Plus, Minus, Trash2, MapPin, Phone, ChevronRight, ShoppingBag, Banknote, CreditCard, Tag, X } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CartPage() {
  useDocumentTitle('Your Cart', 'Review your order and checkout for delivery in Hyderabad.');
  const { items, removeItem, updateQty, totalAmount: itemsSubtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [checkoutInfo, setCheckoutInfo] = useState({ deliveryFee: 0, minOrderAmount: 0, cardPaymentAvailable: false });
  const [pendingPayment, setPendingPayment] = useState(null); // { clientSecret, orderId, amount }
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, percentOff, discountAmount }
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    api.get('/orders/checkout-info').then(res => setCheckoutInfo(res.data)).catch(() => {});
  }, []);

  // A coupon's discount was computed against a specific subtotal — if the
  // cart changes afterward (qty edited, item removed), that discount is
  // stale and must be re-validated rather than silently kept.
  useEffect(() => {
    if (appliedCoupon && appliedCoupon.itemsSubtotal !== itemsSubtotal) {
      setAppliedCoupon(null);
      setCouponError('Cart changed — please re-apply your coupon');
    }
  }, [itemsSubtotal]);

  const deliveryFee = checkoutInfo.deliveryFee || 0;
  const belowMinimum = itemsSubtotal > 0 && itemsSubtotal < checkoutInfo.minOrderAmount;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, itemsSubtotal - discountAmount) + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (!user) return setCouponError('Please login to use a coupon');
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', { code: couponInput.trim(), itemsSubtotal });
      setAppliedCoupon({ ...data, itemsSubtotal });
      setCouponInput('');
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handlePlaceOrder = async () => {
    // Placing an order requires an account (the backend's authenticate
    // middleware rejects it with a raw "Access denied. No token provided."
    // otherwise) — check on the client first so a guest gets sent to login
    // with a clean message instead of that backend error surfacing as a
    // browser alert().
    if (!user) {
      navigate('/login?redirect=/cart');
      return;
    }
    if (!address.trim()) return alert('Please enter your delivery address');
    if (!phone.trim()) return alert('Please enter your phone number');
    if (items.length === 0) return alert('Your cart is empty');
    if (belowMinimum) return alert(`Minimum order amount is Rs. ${checkoutInfo.minOrderAmount}`);

    setPlacing(true);
    try {
      const orderItems = items.map(i => ({
        refType: i.refType,
        refId: i._id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        image: i.image,
        variantName: i.variantName || undefined,
        addOns: (i.addOns || []).map(a => a.name)
      }));

      const { data } = await api.post('/orders', {
        items: orderItems,
        deliveryAddress: { street: address, landmark, city: 'Hyderabad' },
        phone,
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined
      });

      if (paymentMethod === 'card' && data.clientSecret) {
        // Order exists now (paymentStatus: 'pending') — cart is cleared only
        // once the card is actually charged, so a closed tab / failed
        // payment doesn't silently lose the cart contents.
        setPendingPayment({ clientSecret: data.clientSecret, orderId: data.order._id, amount: data.order.totalAmount });
      } else {
        clearCart();
        setAppliedCoupon(null);
        setPlaced(true);
        setTimeout(() => navigate('/track-order'), 2000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const handleCardPaymentSuccess = () => {
    clearCart();
    setAppliedCoupon(null);
    setPendingPayment(null);
    setPlaced(true);
    setTimeout(() => navigate('/track-order'), 2000);
  };

  if (pendingPayment) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold text-mehran-on-surface">Complete Payment</h1>
        <div className="card-surface p-6">
          <StripeCardForm
            clientSecret={pendingPayment.clientSecret}
            amount={pendingPayment.amount}
            onSuccess={handleCardPaymentSuccess}
          />
        </div>
        <p className="text-center text-xs text-mehran-on-surface-variant">
          Your order is saved — you can also find it under Track Order and pay later if you leave this page.
        </p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-mehran-on-surface mb-2">Order Placed!</h2>
        <p className="text-mehran-on-surface-variant">Redirecting to order tracking...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-16 h-16 text-mehran-surface-variant mx-auto mb-4" />
        <h2 className="text-xl font-bold text-mehran-on-surface mb-2">Your cart is empty</h2>
        <p className="text-mehran-on-surface-variant mb-6">Add some delicious items from our menu!</p>
        <button onClick={() => navigate('/menu')} className="btn-primary">Browse Menu</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-mehran-on-surface">Your Cart</h1>

      {/* Cart Items */}
      <div className="space-y-3">
        {items.map(item => {
          const key = getLineKey(item);
          return (
            <div key={key} className="card-surface p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-mehran-surface-container-low rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-6 h-6 text-mehran-surface-variant" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-mehran-on-surface text-sm truncate">{item.name}</h3>
                {(item.variantName || (item.addOns && item.addOns.length > 0)) && (
                  <p className="text-xs text-mehran-on-tertiary-fixed-variant truncate">
                    {item.variantName}
                    {item.variantName && item.addOns?.length > 0 && ' • '}
                    {item.addOns?.map(a => `+ ${a.name}`).join(', ')}
                  </p>
                )}
                <p className="text-mehran-secondary font-semibold">Rs. {item.price * item.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-mehran-surface-container-low rounded-lg">
                  <button onClick={() => updateQty(key, item.qty - 1)} className="px-2 py-1">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-sm font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(key, item.qty + 1)} className="px-2 py-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => removeItem(key)} className="p-2 text-mehran-error hover:bg-mehran-error-container/20 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery Details */}
      <div className="card-surface p-6 space-y-4">
        <h3 className="font-bold text-mehran-on-surface flex items-center gap-2">
          <MapPin className="w-5 h-5 text-mehran-primary" /> Delivery Details
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-mehran-on-surface-variant mb-1 block">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="House #, Street, Area"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-mehran-on-surface-variant mb-1 block">Landmark (optional)</label>
            <input
              type="text"
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder="Near mosque, park, etc."
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-mehran-on-surface-variant mb-1 block">Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mehran-on-tertiary-fixed-variant" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="card-surface p-6 space-y-3">
        <h3 className="font-bold text-mehran-on-surface">Payment Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('COD')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition-all ${
              paymentMethod === 'COD'
                ? 'bg-mehran-secondary text-mehran-on-secondary border-mehran-secondary'
                : 'border-mehran-surface-variant/30 text-mehran-on-surface-variant hover:border-mehran-secondary'
            }`}
          >
            <Banknote className="w-4 h-4" /> Cash on Delivery
          </button>
          <button
            type="button"
            disabled={!checkoutInfo.cardPaymentAvailable}
            onClick={() => setPaymentMethod('card')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              paymentMethod === 'card'
                ? 'bg-mehran-secondary text-mehran-on-secondary border-mehran-secondary'
                : 'border-mehran-surface-variant/30 text-mehran-on-surface-variant hover:border-mehran-secondary'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Pay by Card
          </button>
        </div>
        {!checkoutInfo.cardPaymentAvailable && (
          <p className="text-xs text-mehran-on-surface-variant">Card payment isn't set up yet — Cash on Delivery only for now.</p>
        )}
      </div>

      {/* Coupon */}
      <div className="card-surface p-6 space-y-3">
        <h3 className="font-bold text-mehran-on-surface flex items-center gap-2">
          <Tag className="w-5 h-5 text-mehran-primary" /> Coupon
        </h3>
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-mehran-secondary/10 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-bold text-mehran-secondary">{appliedCoupon.code} applied</p>
              <p className="text-xs text-mehran-on-surface-variant">{appliedCoupon.percentOff}% off — you save Rs. {appliedCoupon.discountAmount}</p>
            </div>
            <button onClick={handleRemoveCoupon} className="p-1.5 text-mehran-on-surface-variant hover:text-mehran-error">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={e => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="input-field flex-1"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-mehran-secondary text-mehran-on-secondary disabled:opacity-50"
            >
              {applyingCoupon ? 'Checking...' : 'Apply'}
            </button>
          </div>
        )}
        {couponError && <p className="text-sm text-mehran-error">{couponError}</p>}
      </div>

      {/* Order Summary */}
      <div className="card-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-mehran-on-surface-variant">Subtotal</span>
          <span className="font-semibold">Rs. {itemsSubtotal}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-mehran-on-surface-variant">Coupon discount</span>
            <span className="font-semibold text-green-500">- Rs. {discountAmount}</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <span className="text-mehran-on-surface-variant">Delivery</span>
          <span className="font-semibold">Rs. {deliveryFee}</span>
        </div>
        <div className="border-t border-mehran-surface-variant/20 pt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-mehran-on-surface">Total</span>
          <span className="text-2xl font-extrabold text-mehran-secondary">Rs. {grandTotal}</span>
        </div>
        {belowMinimum && (
          <p className="text-sm text-mehran-error mt-3">
            Minimum order is Rs. {checkoutInfo.minOrderAmount} (items only) — add Rs. {checkoutInfo.minOrderAmount - itemsSubtotal} more to check out.
          </p>
        )}
        {!user && (
          <p className="text-sm text-mehran-on-surface-variant mt-3 text-center">
            You'll need to{' '}
            <button
              type="button"
              onClick={() => navigate('/login?redirect=/cart')}
              className="text-mehran-secondary font-semibold hover:text-mehran-primary underline"
            >
              log in
            </button>{' '}
            to place an order.
          </p>
        )}
        <button
          onClick={handlePlaceOrder}
          disabled={placing || belowMinimum}
          className="w-full btn-primary mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {placing ? 'Placing Order...' : user ? <>Place Order <ChevronRight className="w-4 h-4" /></> : <>Log In to Order <ChevronRight className="w-4 h-4" /></>}
        </button>
        <p className="text-center text-xs text-mehran-on-surface-variant mt-3">
          {paymentMethod === 'card' ? "You'll enter card details on the next step" : 'Cash on Delivery'}
        </p>
      </div>
    </div>
  );
}
