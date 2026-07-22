const reviewService = require('../services/review.service');
const { asyncHandler } = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { refType, refId, rating, comment } = req.body;
  const review = await reviewService.upsertReview({ user: req.user, refType, refId, rating, comment });
  res.status(201).json(review);
});

const list = asyncHandler(async (req, res) => {
  const { refType, refId } = req.query;
  const reviews = await reviewService.listReviews({ refType, refId });
  res.json(reviews);
});

const summary = asyncHandler(async (req, res) => {
  const { refType, refId } = req.query;
  const result = await reviewService.getSummary({ refType, refId });
  res.json(result);
});

// e.g. GET /reviews/summary-bulk?refType=menuItem — one query covering
// every item, for annotating a full menu listing without N round trips.
const summaryBulk = asyncHandler(async (req, res) => {
  const { refType } = req.query;
  const result = await reviewService.getBulkSummary({ refType });
  res.json(result);
});

const listMine = asyncHandler(async (req, res) => {
  const reviews = await reviewService.listMyReviews(req.user._id);
  res.json(reviews);
});

const remove = asyncHandler(async (req, res) => {
  await reviewService.deleteReview({ reviewId: req.params.id, user: req.user });
  res.json({ message: 'Review deleted' });
});

const setHidden = asyncHandler(async (req, res) => {
  const review = await reviewService.setHidden({ reviewId: req.params.id, isHidden: req.body.isHidden });
  res.json(review);
});

module.exports = { create, list, summary, summaryBulk, listMine, remove, setHidden };
