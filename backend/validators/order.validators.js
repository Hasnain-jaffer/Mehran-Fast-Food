const { body } = require('express-validator');
const { ORDER_STATUSES } = require('../constants/orderStatus');
const { PAYMENT_METHODS } = require('../constants/payment');

const orderStatusValidators = [
  body('status').isIn(ORDER_STATUSES).withMessage('Invalid status'),
  body('note').optional({ nullable: true }).trim().isLength({ max: 300 })
];

const createOrderValidators = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.refType').isIn(['deal', 'menuItem']).withMessage('Invalid item type'),
  body('items.*.refId').isMongoId().withMessage('Invalid item id'),
  body('items.*.qty').optional().isInt({ min: 1 }),
  // Selections only — never a price. The server always looks up the real
  // variant/add-on price from the menu item itself (see order.service.js).
  body('items.*.variantName').optional({ nullable: true }).trim().isString().isLength({ max: 40 }),
  body('items.*.addOns').optional().isArray().withMessage('addOns must be an array of names'),
  body('items.*.addOns.*').optional().isString().trim().notEmpty(),
  body('deliveryAddress.street').trim().notEmpty().withMessage('Delivery street is required'),
  body('phone').optional({ nullable: true }).trim(),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  body('couponCode').optional({ nullable: true }).trim().isString().isLength({ max: 20 })
];

module.exports = { orderStatusValidators, createOrderValidators };
