const mongoose = require('mongoose');

// One entry per redemption, kept on the coupon itself rather than a
// separate collection — coupon usage volume for a single fast food shop
// is nowhere near large enough to need that, and keeping it inline makes
// "has this user already used this code" a single query.
const usageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  usedAt: { type: Date, default: Date.now }
}, { _id: false });

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
  percentOff: { type: Number, required: true, min: 1, max: 100 },
  // Optional cap on the discount amount so e.g. "50% off" can't blow out
  // on a huge order — null/0 means uncapped.
  maxDiscountAmount: { type: Number, default: 0 },
  // Items subtotal (before delivery fee) required to use this code at all.
  minOrderAmount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  // Total redemptions allowed across all customers — null/0 means unlimited.
  usageLimit: { type: Number, default: 0 },
  // Redemptions allowed per individual customer — defaults to 1 so the
  // same customer can't stack a promo code order after order.
  perUserLimit: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  usage: { type: [usageSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
