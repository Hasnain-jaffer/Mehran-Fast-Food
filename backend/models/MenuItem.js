/**
 * MenuItem Model
 * Individual items like Zinger Burger, Seekh Kebab, etc.
 */

const mongoose = require('mongoose');

// A size/type option for this specific item (e.g. Small/Medium/Large,
// Half/Full). Price is base price + priceDelta — never an absolute price —
// so editing the base price doesn't require re-editing every variant.
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  priceDelta: { type: Number, default: 0 },
  // At most one variant per item should be the default (enforced in the
  // controller, not here, since Mongoose subdocument arrays can't easily
  // enforce "at most one true" on their own).
  isDefault: { type: Boolean, default: false }
}, { _id: true });

// An optional extra a customer can add to this specific item (e.g. Extra
// Cheese, Extra Sauce). Scoped per-item, not shared globally, by design.
const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  price: { type: Number, required: true, min: 0 },
  isAvailable: { type: Boolean, default: true }
}, { _id: true });

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  variants: { type: [variantSchema], default: [] },
  addOns: { type: [addOnSchema], default: [] },
  // Stock tracking is opt-in per item (`trackStock`). Most fast-food menu
  // items are effectively always makeable and should just use
  // `isAvailable` as a manual on/off switch — `trackStock` is for items
  // with a genuinely finite daily supply (e.g. a limited daily special).
  // Added in Phase 7 specifically to back the inventory dashboard/low-stock
  // alerts — there was no numeric stock concept in this codebase before.
  stock: {
    trackStock: { type: Boolean, default: false },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 }
  }
}, { timestamps: true });

menuItemSchema.index({ category: 1, isAvailable: 1 });
menuItemSchema.index({ 'stock.trackStock': 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
