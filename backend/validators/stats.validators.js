const { query } = require('express-validator');

const dateRangeValidators = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)')
];

const popularItemsValidators = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
  query('refType').optional().isIn(['menuItem', 'deal']).withMessage('refType must be menuItem or deal')
];

const dailyReportValidators = [
  query('date').optional().isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)')
];

const monthlyReportValidators = [
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid year'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12')
];

module.exports = { dateRangeValidators, popularItemsValidators, dailyReportValidators, monthlyReportValidators };
