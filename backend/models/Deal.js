/**
 * Deal Model
 * Combo deals like "2 Tikka + 2 Paratha + 1 Cold Drink"
 */

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  dealNumber: { type: Number, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  items: [{ type: String, required: true }], // Array of item descriptions
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Deal', dealSchema);
