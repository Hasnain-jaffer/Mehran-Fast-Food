/**
 * Validators for menu items, categories, and deals — the "catalog" resources.
 * Kept in one file since they're small and closely related; split further
 * if any of them grows significantly.
 */

const { body } = require('express-validator');

const menuItemValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('image').optional({ nullable: true }).trim().isString(),
  body('category').notEmpty().withMessage('Category is required').isMongoId().withMessage('Invalid category id'),
  body('isAvailable').optional().isBoolean(),
  body('isPopular').optional().isBoolean(),
  body('variants').optional({ nullable: true }).isArray().withMessage('Variants must be an array'),
  body('variants.*.name').if(body('variants').exists()).trim().notEmpty().withMessage('Variant name is required').isLength({ max: 40 }),
  body('variants.*.priceDelta').optional().isFloat().withMessage('Variant price delta must be a number'),
  body('variants.*.isDefault').optional().isBoolean(),
  body('addOns').optional({ nullable: true }).isArray().withMessage('Add-ons must be an array'),
  body('addOns.*.name').if(body('addOns').exists()).trim().notEmpty().withMessage('Add-on name is required').isLength({ max: 40 }),
  body('addOns.*.price').if(body('addOns').exists()).isFloat({ min: 0 }).withMessage('Add-on price must be a positive number'),
  body('addOns.*.isAvailable').optional().isBoolean(),
  body('stock.trackStock').optional().isBoolean(),
  body('stock.quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('stock.lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer')
];

const categoryValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('image').optional({ nullable: true }).trim().isString(),
  body('sortOrder').optional().isInt(),
  body('icon').optional({ nullable: true }).trim().isString()
];

const dealValidators = [
  body('dealNumber').isInt({ min: 1 }).withMessage('Deal number must be a positive integer'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*').isString().trim().notEmpty(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('image').optional({ nullable: true }).trim().isString(),
  body('isAvailable').optional().isBoolean(),
  body('isPopular').optional().isBoolean(),
  body('sortOrder').optional().isInt()
];

module.exports = { menuItemValidators, categoryValidators, dealValidators };
