/**
 * Order Model
 * Complete order with items, status tracking, and delivery info
 */

const mongoose = require('mongoose');
const { PAYMENT_METHODS, PAYMENT_STATUSES } = require('../constants/payment');

// Snapshot of a selected add-on at order time (name + the price actually
// charged) — kept even if the menu item's add-on list changes later, so
// past orders/receipts stay accurate.
const selectedAddOnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  refType: { type: String, enum: ['deal', 'menuItem'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  // Snapshot of the selected variant name (e.g. "Large"), if any. Only
  // applicable to menuItem lines — deals don't have variants.
  variantName: { type: String, default: null },
  addOns: { type: [selectedAddOnSchema], default: [] },
  qty: { type: Number, required: true, min: 1 },
  // Unit price already includes the variant delta + sum of add-ons —
  // this is the actual per-unit price charged, always computed server-side.
  price: { type: Number, required: true },
  image: { type: String, default: '' }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  // Which staff member made this change — null for the initial 'placed'
  // entry (the customer placed it, not staff) and for customer-initiated
  // cancellations. Powers the employee dashboard's "orders processed per
  // staff member" metric.
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  // Sum of item lines only (qty * unit price), before delivery fee.
  itemsSubtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true, default: 0 },
  // Set only if a coupon was applied. Kept even though the coupon itself
  // is a separate document, so past orders show what code/discount was
  // actually used even if the coupon is later edited or deleted.
  couponCode: { type: String, default: null },
  discountAmount: { type: Number, default: 0 },
  // itemsSubtotal - discountAmount + deliveryFee — the actual amount charged/collected.
  totalAmount: { type: Number, required: true },
  deliveryAddress: {
    street: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, default: 'Hyderabad' }
  },
  phone: { type: String, required: true },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'COD' },
  // For COD this stays 'pending' until the order is marked delivered (at
  // which point it's auto-flipped to 'paid' — see order.service.js), since
  // cash actually changes hands at the door. For 'card' it tracks the
  // Stripe PaymentIntent's lifecycle via webhook.
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
  // Set only for card orders — links this order to its Stripe PaymentIntent
  // so the webhook handler can find the right order to update.
  stripePaymentIntentId: { type: String, default: null },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed'
  },
  statusHistory: [statusHistorySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-add initial status to history
orderSchema.pre('save', function(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.orderStatus, timestamp: new Date() });
  }
  this.updatedAt = new Date();
  next();
});

// Index for performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ stripePaymentIntentId: 1 });

module.exports = mongoose.model('Order', orderSchema);
