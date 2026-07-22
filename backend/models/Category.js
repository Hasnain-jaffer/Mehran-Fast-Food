/**
 * Category Model
 * Menu categories like Burgers, Rolls, Falooda, etc.
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  icon: { type: String, default: 'restaurant_menu' } // Material icon name
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
