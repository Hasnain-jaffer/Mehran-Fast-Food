const Deal = require('../models/Deal');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

const list = asyncHandler(async (req, res) => {
  const deals = await Deal.find().sort({ sortOrder: 1, dealNumber: 1 });
  res.json(deals);
});

const getById = asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.id);
  if (!deal) throw new ApiError(404, 'Deal not found');
  res.json(deal);
});

const create = asyncHandler(async (req, res) => {
  const { dealNumber, title, items, price, image, isAvailable, isPopular, sortOrder } = req.body;
  const deal = await Deal.create({ dealNumber, title, items, price, image, isAvailable, isPopular, sortOrder });
  res.status(201).json(deal);
});

const update = asyncHandler(async (req, res) => {
  const { dealNumber, title, items, price, image, isAvailable, isPopular, sortOrder } = req.body;
  const deal = await Deal.findByIdAndUpdate(
    req.params.id,
    { dealNumber, title, items, price, image, isAvailable, isPopular, sortOrder },
    { new: true, runValidators: true }
  );
  if (!deal) throw new ApiError(404, 'Deal not found');
  res.json(deal);
});

const remove = asyncHandler(async (req, res) => {
  const deal = await Deal.findByIdAndDelete(req.params.id);
  if (!deal) throw new ApiError(404, 'Deal not found');
  res.json({ message: 'Deal deleted' });
});

module.exports = { list, getById, create, update, remove };
