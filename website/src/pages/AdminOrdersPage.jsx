/**
 * AdminOrdersPage - View all orders, filter by status, update order status
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Package, ArrowLeft, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';

const allStatuses = ['all', 'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const PAYMENT_STATUS_LABELS = { pending: 'Payment Pending', paid: 'Paid', failed: 'Payment Failed', refunded: 'Refunded' };

export default function AdminOrdersPage() {
  useDocumentTitle('Manage Orders', null, { noIndex: true });
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/orders' : `/orders?status=${filter}`;
      const res = await api.get(url);
      setOrders(res.data);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-mehran-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-mehran-on-surface mb-2">Access Denied</h2>
          <Link to="/admin/login" className="btn-primary">Login as Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mehran-bg text-mehran-on-bg font-jakarta">
      <div className="bg-mehran-surface-container-high border-b border-mehran-surface-variant/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-mehran-on-surface-variant hover:text-mehran-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-mehran-on-surface">Manage Orders</h1>
          <button onClick={fetchOrders} className="ml-auto p-2 hover:bg-mehran-surface-variant/20 rounded-lg">
            <RefreshCw className="w-4 h-4 text-mehran-on-surface-variant" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {allStatuses.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-mehran-secondary text-mehran-on-secondary'
                  : 'bg-mehran-surface-container text-mehran-on-surface-variant hover:bg-mehran-surface-variant/20'
              }`}
            >
              {status === 'all' ? 'All Orders' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-mehran-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-mehran-surface-variant mx-auto mb-3" />
            <p className="text-mehran-on-surface-variant">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const isExpanded = expandedOrder === order._id;
              return (
                <div key={order._id} className="card-surface overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-mehran-surface-variant/10"
                    onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-mehran-on-surface text-sm">Order #{order._id.slice(-6).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${STATUS_COLORS[order.orderStatus]}`}>
                          {STATUS_LABELS[order.orderStatus]}
                        </span>
                      </div>
                      <p className="text-xs text-mehran-on-surface-variant">
                        {order.user?.name} • {order.user?.phone} • Rs. {order.totalAmount}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-mehran-on-surface-variant" /> : <ChevronDown className="w-5 h-5 text-mehran-on-surface-variant" />}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-mehran-surface-variant/20 pt-4 space-y-4">
                      {/* Items */}
                      <div>
                        <h4 className="text-xs font-bold text-mehran-on-surface mb-2">Items</h4>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1">
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

                      {/* Payment */}
                      <div className="text-sm space-y-1 border-t border-mehran-surface-variant/20 pt-3">
                        <div className="flex justify-between text-mehran-on-surface-variant">
                          <span>Items subtotal</span><span>Rs. {order.itemsSubtotal ?? order.totalAmount}</span>
                        </div>
                        {order.deliveryFee > 0 && (
                          <div className="flex justify-between text-mehran-on-surface-variant">
                            <span>Delivery fee</span><span>Rs. {order.deliveryFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-mehran-on-surface-variant">{order.paymentMethod === 'card' ? 'Card' : 'Cash on Delivery'}</span>
                          <span className={order.paymentStatus === 'paid' ? 'text-green-500 font-semibold' : 'text-mehran-on-surface-variant'}>
                            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="text-sm">
                        <span className="text-mehran-on-surface-variant">Address: </span>
                        <span className="text-mehran-on-surface">{order.deliveryAddress?.street}</span>
                        {order.deliveryAddress?.landmark && (
                          <span className="text-mehran-on-surface-variant"> (Near: {order.deliveryAddress.landmark})</span>
                        )}
                      </div>

                      {/* Status Update */}
                      {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                        <div className="flex flex-wrap gap-2">
                          {['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(order._id, s)}
                              disabled={updatingId === order._id || order.orderStatus === s}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
                                order.orderStatus === s
                                  ? 'bg-mehran-surface-variant text-mehran-on-surface'
                                  : 'bg-mehran-primary-container text-white hover:brightness-110'
                              }`}
                            >
                              {updatingId === order._id ? '...' : STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
