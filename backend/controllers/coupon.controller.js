const Coupon = require('../models/Coupon');
const couponService = require('../services/coupon.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

const list = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
});

const create = asyncHandler(async (req, res) => {
  const { code, percentOff, maxDiscountAmount, minOrderAmount, expiresAt, usageLimit, perUserLimit, isActive } = req.body;
  const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (existing) {
    throw new ApiError(409, 'A coupon with this code already exists');
  }
  const coupon = await Coupon.create({
    code, percentOff, maxDiscountAmount, minOrderAmount, expiresAt, usageLimit, perUserLimit, isActive
  });
  res.status(201).json(coupon);
});

const update = asyncHandler(async (req, res) => {
  const { percentOff, maxDiscountAmount, minOrderAmount, expiresAt, usageLimit, perUserLimit, isActive } = req.body;
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { percentOff, maxDiscountAmount, minOrderAmount, expiresAt, usageLimit, perUserLimit, isActive },
    { new: true, runValidators: true }
  );
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.json(coupon);
});

const remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.json({ message: 'Coupon deleted' });
});

// Public — lets the cart page check a code and show the discount before
// the customer commits to placing the order. Does NOT record usage;
// that only happens if an order is actually created with this code.
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, itemsSubtotal } = req.body;
  const coupon = await couponService.findValidCoupon({ code, user: req.user, itemsSubtotal });
  const discountAmount = couponService.computeDiscount(coupon, itemsSubtotal);
  res.json({ code: coupon.code, percentOff: coupon.percentOff, discountAmount });
});

module.exports = { list, create, update, remove, validateCoupon };
