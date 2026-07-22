const MenuItem = require('../models/MenuItem');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

// Ensures at most one variant is flagged isDefault (the first one flagged,
// if the client sent more than one — silently, rather than erroring, since
// it's the kind of duplicate-checkbox slip an admin form can easily produce).
// Also strips the field entirely when the client didn't send variants/addOns
// at all, so create/update don't clobber existing values with `undefined`.
function normalizeCatalogFields(body) {
  const out = {};
  if (body.variants !== undefined) {
    let defaultSeen = false;
    out.variants = (body.variants || []).map((v) => {
      const isDefault = !defaultSeen && !!v.isDefault;
      if (isDefault) defaultSeen = true;
      return { name: v.name, priceDelta: Number(v.priceDelta) || 0, isDefault };
    });
  }
  if (body.addOns !== undefined) {
    out.addOns = (body.addOns || []).map((a) => ({
      name: a.name,
      price: Number(a.price) || 0,
      isAvailable: a.isAvailable !== false
    }));
  }
  if (body.stock !== undefined) {
    out.stock = {
      trackStock: !!body.stock.trackStock,
      quantity: Number(body.stock.quantity) || 0,
      lowStockThreshold: body.stock.lowStockThreshold !== undefined
        ? Number(body.stock.lowStockThreshold)
        : 5
    };
  }
  return out;
}

// Supports optional ?category= and ?search= (matches name/description,
// case-insensitively) — additive, existing calls with no query params
// keep returning everything exactly as before.
const list = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (search && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } }
    ];
  }
  const items = await MenuItem.find(filter)
    .populate('category', 'name icon')
    .sort({ isPopular: -1, createdAt: -1 });
  res.json(items);
});

const create = asyncHandler(async (req, res) => {
  const { name, description, price, image, category, isAvailable, isPopular } = req.body;
  const item = await MenuItem.create({
    name, description, price, image, category, isAvailable, isPopular,
    ...normalizeCatalogFields(req.body)
  });
  await item.populate('category');
  res.status(201).json(item);
});

const update = asyncHandler(async (req, res) => {
  const { name, description, price, image, category, isAvailable, isPopular } = req.body;
  const item = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { name, description, price, image, category, isAvailable, isPopular, ...normalizeCatalogFields(req.body) },
    { new: true, runValidators: true }
  ).populate('category');
  if (!item) throw new ApiError(404, 'Menu item not found');
  res.json(item);
});

const remove = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Menu item not found');
  res.json({ message: 'Menu item deleted' });
});

module.exports = { list, create, update, remove };
