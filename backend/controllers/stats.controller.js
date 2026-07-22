const statsService = require('../services/stats.service');
const { asyncHandler } = require('../utils/asyncHandler');

// Unchanged from Phase 0 — existing admin-panel code reading this shape
// keeps working.
const dashboard = asyncHandler(async (req, res) => {
  const stats = await statsService.getDashboardStats();
  res.json(stats);
});

const sales = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await statsService.getSalesAnalytics({ startDate, endDate });
  res.json(result);
});

const popularItems = asyncHandler(async (req, res) => {
  const { limit, refType } = req.query;
  const result = await statsService.getPopularItems({ limit: limit ? Number(limit) : undefined, refType });
  res.json(result);
});

const orderStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await statsService.getOrderStatistics({ startDate, endDate });
  res.json(result);
});

const customerStatistics = asyncHandler(async (req, res) => {
  const result = await statsService.getCustomerStatistics();
  res.json(result);
});

const inventory = asyncHandler(async (req, res) => {
  const result = await statsService.getInventoryDashboard();
  res.json(result);
});

const lowStockAlerts = asyncHandler(async (req, res) => {
  const result = await statsService.getLowStockAlerts();
  res.json(result);
});

const employeeDashboard = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await statsService.getEmployeeDashboard({ startDate, endDate });
  res.json(result);
});

const dailyReport = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const result = await statsService.getDailyReport(date ? new Date(date) : undefined);
  res.json(result);
});

const monthlyReport = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const result = await statsService.getMonthlyReport({ year, month });
  res.json(result);
});

module.exports = {
  dashboard,
  sales,
  popularItems,
  orderStatistics,
  customerStatistics,
  inventory,
  lowStockAlerts,
  employeeDashboard,
  dailyReport,
  monthlyReport
};
