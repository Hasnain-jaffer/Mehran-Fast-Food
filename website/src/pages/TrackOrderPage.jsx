/**
 * TrackOrderPage - View order history and track current orders
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Package, Clock, CheckCircle, Truck, MapPin, ChevronDown, ChevronUp, XCircle, Star } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const statusIcons = {
  placed: Clock, confirmed: CheckCircle, preparing: Package,
  out_for_delivery: Truck, delivered: CheckCircle, cancelled: Clock
};

const statusOrder = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

const PAYMENT_STATUS_LABELS = { pending: 'Payment Pending', paid: 'Paid', failed: 'Payment Failed', refunded: 'Refunded' };

const reviewKey = (item) => `${item.refType}:${item.refId}`;

export function ReviewRow({ item, existingReview, onSubmitted }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [editing, setEditing] = useState(!existingReview);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return alert('Please select a star rating');
    setSubmitting(true);
    try {
      const { data } = await api.post('/reviews', { refType: item.refType, refId: item.refId, rating, comment });
      onSubmitted(data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-mehran-surface-variant/20 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-mehran-on-surface">{item.name}</p>
      {editing ? (
        <>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={`w-5 h-5 ${n <= rating ? 'fill-mehran-secondary text-mehran-secondary' : 'text-mehran-surface-variant'}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Optional comment..."
            rows={2}
            className="input-field text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-mehran-secondary text-mehran-on-secondary disabled:opacity-50"
          >
            {submitting ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
          </button>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={`w-4 h-4 ${n <= rating ? 'fill-mehran-secondary text-mehran-secondary' : 'text-mehran-surface-variant'}`} />
            ))}
            {comment && <span className="text-xs text-mehran-on-surface-variant ml-2">"{comment}"</span>}
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-mehran-secondary font-semibold">Edit</button>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  useDocumentTitle('Track Your Order', 'Check the live status of your Mehran Fast Food order.');
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [myReviews, setMyReviews] = useState({}); // "refType:refId" -> review

  const fetchOrders = () => {
    if (!user) return;
    api.get('/orders/my')
      .then(res => { setOrders(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(fetchOrders, [user]);

  useEffect(() => {
    if (!user) return;
    api.get('/reviews/mine').then(res => {
      const map = {};
      res.data.forEach(r => { map[`${r.refType}:${r.refId}`] = r; });
      setMyReviews(map);
    }).catch(() => {});
  }, [user]);

  const handleCancel = async (orderId) => {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    setCancellingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel this order');
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 text-mehran-surface-variant mx-auto mb-4" />
        <h2 className="text-xl font-bold text-mehran-on-surface mb-2">Please login to track orders</h2>
        <p className="text-mehran-on-surface-variant">Login from the admin page to view your orders.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-mehran-secondary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-mehran-on-surface-variant mt-4">Loading your orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 text-mehran-surface-variant mx-auto mb-4" />
        <h2 className="text-xl font-bold text-mehran-on-surface mb-2">No orders yet</h2>
        <p className="text-mehran-on-surface-variant">Place your first order and track it here!</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-mehran-on-surface">Track Your Orders</h1>

      {orders.map(order => {
        const isExpanded = expandedOrder === order._id;
        const currentStatusIndex = statusOrder.indexOf(order.orderStatus);
        const StatusIcon = statusIcons[order.orderStatus] || Clock;

        return (
          <div key={order._id} className="card-surface overflow-hidden">
            {/* Order Header */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-mehran-surface-variant/10 transition-colors"
              onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${STATUS_COLORS[order.orderStatus]}`}>
                  <StatusIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-mehran-on-surface text-sm">Order #{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-mehran-on-surface-variant">
                    {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-mehran-secondary">Rs. {order.totalAmount}</span>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-mehran-on-surface-variant" /> : <ChevronDown className="w-5 h-5 text-mehran-on-surface-variant" />}
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-mehran-surface-variant/20 pt-4 space-y-4">
                {/* Progress Bar */}
                {order.orderStatus !== 'cancelled' && (
                  <div className="flex items-center gap-1">
                    {statusOrder.map((status, idx) => (
                      <div key={status} className="flex-1 flex items-center gap-1">
                        <div className={`h-2 flex-1 rounded-full ${idx <= currentStatusIndex ? 'bg-mehran-secondary' : 'bg-mehran-surface-variant/30'}`} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Status Labels */}
                <div className="flex justify-between text-xs">
                  {statusOrder.map(status => (
                    <span key={status} className={`${status === order.orderStatus ? 'text-mehran-secondary font-bold' : 'text-mehran-on-surface-variant/50'}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  ))}
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-mehran-on-surface">Items</h4>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-mehran-on-surface-variant">
                        {item.qty}x {item.name}
                        {(item.variantName || item.addOns?.length > 0) && (
                          <span className="block text-xs opacity-75">
                            {item.variantName}
                            {item.variantName && item.addOns?.length > 0 && ' • '}
                            {item.addOns?.map(a => `+ ${a.name}`).join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="text-mehran-on-surface font-semibold">Rs. {item.price * item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Fee breakdown */}
                <div className="text-sm space-y-1 border-t border-mehran-surface-variant/20 pt-3">
                  <div className="flex justify-between text-mehran-on-surface-variant">
                    <span>Items subtotal</span><span>Rs. {order.itemsSubtotal ?? order.totalAmount}</span>
                  </div>
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between text-mehran-on-surface-variant">
                      <span>Delivery fee</span><span>Rs. {order.deliveryFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-mehran-on-surface">
                    <span>Total</span><span>Rs. {order.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-mehran-on-surface-variant pt-1">
                    <span>{order.paymentMethod === 'card' ? 'Paid by Card' : 'Cash on Delivery'}</span>
                    <span>{PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-mehran-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-mehran-on-surface">{order.deliveryAddress?.street}</p>
                    {order.deliveryAddress?.landmark && (
                      <p className="text-mehran-on-surface-variant text-xs">Near: {order.deliveryAddress.landmark}</p>
                    )}
                  </div>
                </div>

                {order.orderStatus === 'delivered' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-mehran-on-surface">Rate Your Items</h4>
                    {order.items.map((item, idx) => (
                      <ReviewRow
                        key={idx}
                        item={item}
                        existingReview={myReviews[reviewKey(item)]}
                        onSubmitted={(review) => setMyReviews(prev => ({ ...prev, [reviewKey(item)]: review }))}
                      />
                    ))}
                  </div>
                )}

                {order.orderStatus === 'placed' && (
                  <button
                    onClick={() => handleCancel(order._id)}
                    disabled={cancellingId === order._id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-mehran-error border border-mehran-error/40 hover:bg-mehran-error-container/20 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
