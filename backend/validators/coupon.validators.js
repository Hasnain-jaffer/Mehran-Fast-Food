const { body, query } = require('express-validator');

const couponCreateValidators = [
  body('code').trim().notEmpty().withMessage('Code is required').isLength({ max: 20 }),
  body('percentOff').isFloat({ min: 1, max: 100 }).withMessage('percentOff must be between 1 and 100'),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('expiresAt').optional({ nullable: true }).isISO8601().withMessage('expiresAt must be a valid date'),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
];

const couponUpdateValidators = [
  body('percentOff').optional().isFloat({ min: 1, max: 100 }),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('expiresAt').optional({ nullable: true }).isISO8601(),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
];

const couponValidateValidators = [
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('itemsSubtotal').isFloat({ min: 0 }).withMessage('itemsSubtotal must be a number')
];

module.exports = { couponCreateValidators, couponUpdateValidators, couponValidateValidators };
