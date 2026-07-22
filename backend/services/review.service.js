const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { ApiError } = require('../utils/ApiError');
const { ROLES } = require('../constants/roles');

async function assertVerifiedPurchase({ user, refType, refId }) {
  const deliveredOrder = await Order.findOne({
    user: user._id,
    orderStatus: 'delivered',
    items: { $elemMatch: { refType, refId } }
  }).sort({ createdAt: -1 });

  if (!deliveredOrder) {
    throw new ApiError(403, 'You can only review items from an order that has been delivered to you');
  }
  return deliveredOrder;
}

// One review per customer per item: resubmitting overwrites the previous
// rating/comment rather than creating a duplicate (the unique index on
// {user, refType, refId} would reject a plain insert anyway).
async function upsertReview({ user, refType, refId, rating, comment }) {
  const order = await assertVerifiedPurchase({ user, refType, refId });

  const review = await Review.findOneAndUpdate(
    { user: user._id, refType, refId },
    { rating, comment: comment || '', order: order._id, isHidden: false },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true, context: 'query' }
  );
  return review;
}

async function listReviews({ refType, refId }) {
  return Review.find({ refType, refId, isHidden: false }).sort({ createdAt: -1 }).populate('user', 'name');
}

async function listMyReviews(userId) {
  return Review.find({ user: userId }).sort({ createdAt: -1 });
}

async function getSummary({ refType, refId }) {
  const [result] = await Review.aggregate([
    { $match: { refType, refId: new mongoose.Types.ObjectId(refId), isHidden: false } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  return { avgRating: result ? Math.round(result.avgRating * 10) / 10 : null, count: result ? result.count : 0 };
}

// One aggregation covering every item of a type, so a menu listing page
// can annotate every card's rating without N separate summary calls.
async function getBulkSummary({ refType }) {
  const results = await Review.aggregate([
    { $match: { refType, isHidden: false } },
    { $group: { _id: '$refId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const map = {};
  results.forEach((r) => {
    map[r._id.toString()] = { avgRating: Math.round(r.avgRating * 10) / 10, count: r.count };
  });
  return map;
}

async function deleteReview({ reviewId, user }) {
  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');
  const isOwner = review.user.toString() === user._id.toString();
  const isStaff = user.role !== ROLES.CUSTOMER;
  if (!isOwner && !isStaff) {
    throw new ApiError(403, 'You can only delete your own reviews');
  }
  await review.deleteOne();
}

async function setHidden({ reviewId, isHidden }) {
  const review = await Review.findByIdAndUpdate(reviewId, { isHidden }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');
  return review;
}

module.exports = { upsertReview, listReviews, listMyReviews, getSummary, getBulkSummary, deleteReview, setHidden };
