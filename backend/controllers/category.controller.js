const Category = require('../models/Category');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

const list = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1 });
  res.json(categories);
});

const create = asyncHandler(async (req, res) => {
  const { name, image, sortOrder, icon } = req.body;
  const category = await Category.create({ name, image, sortOrder, icon });
  res.status(201).json(category);
});

const update = asyncHandler(async (req, res) => {
  const { name, image, sortOrder, icon } = req.body;
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, image, sortOrder, icon },
    { new: true, runValidators: true }
  );
  if (!category) throw new ApiError(404, 'Category not found');
  res.json(category);
});

const remove = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ message: 'Category deleted' });
});

module.exports = { list, create, update, remove };
