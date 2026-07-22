const Coupon = require('../models/Coupon');
const { ApiError } = require('../utils/ApiError');

// Looks up a code and checks every eligibility rule EXCEPT nothing here
// ever mutates state — usage is only recorded once an order is actually
// created (recordUsage), so a failed/abandoned checkout never burns a
// customer's single-use coupon.
async function findValidCoupon({ code, user, itemsSubtotal }) {
  const coupon = await Coupon.findOne({ code: (code || '').trim().toUpperCase() });
  if (!coupon || !coupon.isActive) {
    throw new ApiError(400, 'Invalid or inactive coupon code');
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new ApiError(400, 'This coupon has expired');
  }
  if (coupon.minOrderAmount && itemsSubtotal < coupon.minOrderAmount) {
    throw new ApiError(400, `This coupon requires a minimum order of Rs. ${coupon.minOrderAmount}`);
  }
  if (coupon.usageLimit > 0 && coupon.usage.length >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit');
  }
  if (coupon.perUserLimit > 0) {
    const userUsageCount = coupon.usage.filter((u) => u.user.toString() === user._id.toString()).length;
    if (userUsageCount >= coupon.perUserLimit) {
      throw new ApiError(400, 'You have already used this coupon');
    }
  }
  return coupon;
}

function computeDiscount(coupon, itemsSubtotal) {
  let discount = Math.round((itemsSubtotal * coupon.percentOff) / 100);
  if (coupon.maxDiscountAmount > 0) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }
  // Never let a discount exceed the subtotal it's discounting.
  return Math.min(discount, itemsSubtotal);
}

async function recordUsage(coupon, { user, order }) {
  coupon.usage.push({ user: user._id, order: order._id });
  await coupon.save();
}

// Called when an order that used a coupon gets cancelled — the customer
// shouldn't lose their single use of a code for an order that never
// actually happened.
async function releaseUsage(couponCode, orderId) {
  if (!couponCode) return;
  const coupon = await Coupon.findOne({ code: couponCode });
  if (!coupon) return;
  coupon.usage = coupon.usage.filter((u) => u.order.toString() !== orderId.toString());
  await coupon.save();
}

module.exports = { findValidCoupon, computeDiscount, recordUsage, releaseUsage };
