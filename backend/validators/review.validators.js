const { body, query } = require('express-validator');

const reviewCreateValidators = [
  body('refType').isIn(['menuItem', 'deal']).withMessage('Invalid item type'),
  body('refId').isMongoId().withMessage('Invalid item id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ nullable: true }).trim().isLength({ max: 500 })
];

const reviewListValidators = [
  query('refType').isIn(['menuItem', 'deal']).withMessage('Invalid item type'),
  query('refId').isMongoId().withMessage('Invalid item id')
];

module.exports = { reviewCreateValidators, reviewListValidators };
