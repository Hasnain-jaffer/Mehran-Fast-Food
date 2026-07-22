const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refType: { type: String, enum: ['menuItem', 'deal'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true },
  // The delivered order that makes this a verified purchase — kept as
  // proof, and so a customer could in principle review the same item
  // again after a later separate order, if that's ever wanted (not
  // currently exposed — one review per user per item is enforced below).
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 500 },
  // Lets an admin quietly unpublish an abusive/spam review without
  // deleting it outright (deletion is also available, for genuine removal
  // requests). Hidden reviews are excluded from public listings/summaries.
  isHidden: { type: Boolean, default: false }
}, { timestamps: true });

// One review per customer per item — resubmitting is an edit, not a
// second review (see review.controller.js upsert behavior).
reviewSchema.index({ user: 1, refType: 1, refId: 1 }, { unique: true });
reviewSchema.index({ refType: 1, refId: 1, isHidden: 1 });

module.exports = mongoose.model('Review', reviewSchema);
