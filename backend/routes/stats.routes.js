/**
 * Admin Dashboard / Analytics Routes (mounted at /api/admin/stats)
 *
 * Access is split by sensitivity, not just "any staff member":
 *   - STAFF_LEVEL (kitchen/counter/delivery/support/manager/admin/superAdmin):
 *     operational data that's useful on the floor — popular items, stock
 *     levels, order status breakdown. Nothing here reveals money figures
 *     or individual staff performance.
 *   - ADMIN_LEVEL (manager/admin/superAdmin only): anything involving
 *     revenue, individual customer spend, or per-employee performance —
 *     this is business-sensitive information a delivery rider or kitchen
 *     staff member has no operational need to see.
 */

const express = require('express');
const router = express.Router();

const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { STAFF_LEVEL, ADMIN_LEVEL } = require('../constants/roles');
const {
  dateRangeValidators,
  popularItemsValidators,
  dailyReportValidators,
  monthlyReportValidators
} = require('../validators/stats.validators');

// Unchanged from Phase 0 (path and shape) — existing admin-panel code
// keeps working without modification.
router.get('/', authenticate, authorize(...STAFF_LEVEL), statsController.dashboard);

// --- Revenue/financial — admin level only ---
router.get('/sales', authenticate, authorize(...ADMIN_LEVEL), dateRangeValidators, validate, statsController.sales);
router.get('/orders', authenticate, authorize(...ADMIN_LEVEL), dateRangeValidators, validate, statsController.orderStatistics);
router.get('/customers', authenticate, authorize(...ADMIN_LEVEL), statsController.customerStatistics);
router.get('/employees', authenticate, authorize(...ADMIN_LEVEL), dateRangeValidators, validate, statsController.employeeDashboard);
router.get('/reports/daily', authenticate, authorize(...ADMIN_LEVEL), dailyReportValidators, validate, statsController.dailyReport);
router.get('/reports/monthly', authenticate, authorize(...ADMIN_LEVEL), monthlyReportValidators, validate, statsController.monthlyReport);

// --- Operational — any staff-level role ---
router.get('/popular-items', authenticate, authorize(...STAFF_LEVEL), popularItemsValidators, validate, statsController.popularItems);
router.get('/inventory', authenticate, authorize(...STAFF_LEVEL), statsController.inventory);
router.get('/low-stock', authenticate, authorize(...STAFF_LEVEL), statsController.lowStockAlerts);

module.exports = router;
