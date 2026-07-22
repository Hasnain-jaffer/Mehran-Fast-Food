/**
 * Stats Service — Admin Dashboard Analytics (Phase 7)
 *
 * Every function here uses MongoDB aggregation pipelines rather than
 * loading full collections into Node and reducing in memory — this was
 * already the established pattern from Phase 0 (see getDashboardStats)
 * and matters even more now that there's more data (orders, users, menu
 * items) to summarize. Aggregation stays fast as these collections grow;
 * pulling every document into memory does not.
 */

const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Deal = require('../models/Deal');
const { ACTIVE_ORDER_STATUSES, ORDER_STATUSES } = require('../constants/orderStatus');
const { ROLES } = require('../constants/roles');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// --- Existing top-level dashboard summary (Phase 0 — unchanged shape) ----
// Kept exactly as-is so any existing admin-panel code reading these fields
// keeps working; new, more detailed analytics live in the functions below
// rather than reshaping this one.
async function getDashboardStats() {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const [todayStats] = await Order.aggregate([
    { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
  ]);

  const pendingCount = await Order.countDocuments({ orderStatus: { $in: ACTIVE_ORDER_STATUSES } });
  const activeDeliveryCount = await Order.countDocuments({ orderStatus: 'out_for_delivery' });

  const topDealsAgg = await Order.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.refType': 'deal' } },
    { $group: { _id: '$items.name', count: { $sum: '$items.qty' } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, name: '$_id', count: 1 } }
  ]);

  let topDeals = topDealsAgg;
  if (topDeals.length === 0) {
    const allDeals = await Deal.find().sort({ dealNumber: 1 }).limit(5);
    topDeals = allDeals.map((d) => ({ name: d.title, count: 0 }));
  }

  return {
    todayOrderCount: todayStats?.count || 0,
    todayRevenue: todayStats?.revenue || 0,
    pendingCount,
    activeDeliveryCount,
    topDeals
  };
}

// --- 1. Sales Analytics ----------------------------------------------------
// Revenue + order count grouped by day across a date range (defaults to
// the last 30 days). Only counts orders that were actually paid/delivered
// worth of revenue-recognizing statuses — cancelled orders are excluded so
// "sales" reflects money actually made, not just orders attempted.
async function getSalesAnalytics({ startDate, endDate } = {}) {
  const end = endDate ? startOfDay(endDate) : startOfDay(new Date());
  const rangeEnd = addDays(end, 1);
  const start = startDate ? startOfDay(startDate) : addDays(end, -29); // 30 days inclusive by default

  const daily = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lt: rangeEnd },
        orderStatus: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orderCount: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
        itemsSubtotal: { $sum: '$itemsSubtotal' },
        discountTotal: { $sum: '$discountAmount' }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', orderCount: 1, revenue: 1, itemsSubtotal: 1, discountTotal: 1 } }
  ]);

  const totals = daily.reduce(
    (acc, d) => ({
      orderCount: acc.orderCount + d.orderCount,
      revenue: acc.revenue + d.revenue,
      discountTotal: acc.discountTotal + d.discountTotal
    }),
    { orderCount: 0, revenue: 0, discountTotal: 0 }
  );

  return {
    range: { start: start.toISOString(), end: end.toISOString() },
    daily,
    totals: {
      ...totals,
      averageOrderValue: totals.orderCount > 0 ? totals.revenue / totals.orderCount : 0
    }
  };
}

// --- 2. Popular Food Analytics ---------------------------------------------
// Top items/deals by quantity sold AND by revenue generated — these can
// rank differently (a cheap item sold often vs. an expensive item sold
// rarely), so both are returned rather than picking one ranking silently.
async function getPopularItems({ limit = 10, refType } = {}) {
  const matchStage = refType ? { 'items.refType': refType } : {};

  const agg = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    ...(refType ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: { refType: '$items.refType', refId: '$items.refId', name: '$items.name' },
        qtySold: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
      }
    },
    { $project: { _id: 0, refType: '$_id.refType', refId: '$_id.refId', name: '$_id.name', qtySold: 1, revenue: 1 } }
  ]);

  const byQuantity = [...agg].sort((a, b) => b.qtySold - a.qtySold).slice(0, limit);
  const byRevenue = [...agg].sort((a, b) => b.revenue - a.revenue).slice(0, limit);

  return { byQuantity, byRevenue };
}

// --- 3. Order Statistics ----------------------------------------------------
// Status breakdown, average order value, cancellation rate, and average
// fulfillment time (placed -> delivered) — computed from statusHistory
// timestamps already recorded on every order, no new tracking needed.
async function getOrderStatistics({ startDate, endDate } = {}) {
  const matchDate = {};
  if (startDate) matchDate.$gte = startOfDay(startDate);
  if (endDate) matchDate.$lt = addDays(startOfDay(endDate), 1);
  const dateFilter = (startDate || endDate) ? { createdAt: matchDate } : {};

  const statusBreakdown = await Order.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } }
  ]);

  // Ensure every known status appears even with a zero count, so a
  // dashboard chart doesn't have to special-case "missing" statuses.
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  statusBreakdown.forEach((s) => { statusCounts[s.status] = s.count; });

  const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const cancelledCount = statusCounts.cancelled || 0;
  const cancellationRate = totalOrders > 0 ? cancelledCount / totalOrders : 0;

  const [avgAgg] = await Order.aggregate([
    { $match: { ...dateFilter, orderStatus: { $ne: 'cancelled' } } },
    { $group: { _id: null, avgOrderValue: { $avg: '$totalAmount' } } }
  ]);

  // Average fulfillment time: for delivered orders, time between the
  // 'placed' entry and the 'delivered' entry in statusHistory.
  const fulfillmentAgg = await Order.aggregate([
    { $match: { ...dateFilter, orderStatus: 'delivered' } },
    {
      $project: {
        placedAt: { $arrayElemAt: [{ $filter: { input: '$statusHistory', cond: { $eq: ['$$this.status', 'placed'] } } }, 0] },
        deliveredAt: { $arrayElemAt: [{ $filter: { input: '$statusHistory', cond: { $eq: ['$$this.status', 'delivered'] } } }, 0] }
      }
    },
    {
      $project: {
        fulfillmentMinutes: {
          $divide: [{ $subtract: ['$deliveredAt.timestamp', '$placedAt.timestamp'] }, 60000]
        }
      }
    },
    { $group: { _id: null, avgFulfillmentMinutes: { $avg: '$fulfillmentMinutes' } } }
  ]);

  return {
    statusCounts,
    totalOrders,
    cancellationRate,
    averageOrderValue: avgAgg?.avgOrderValue || 0,
    averageFulfillmentMinutes: fulfillmentAgg[0]?.avgFulfillmentMinutes || null
  };
}

// --- 4. Customer Statistics -------------------------------------------------
async function getCustomerStatistics() {
  const today = startOfDay(new Date());
  const weekAgo = addDays(today, -7);
  const monthAgo = addDays(today, -30);

  const totalCustomers = await User.countDocuments({ role: ROLES.CUSTOMER, deletedAt: null });
  const newThisWeek = await User.countDocuments({ role: ROLES.CUSTOMER, deletedAt: null, createdAt: { $gte: weekAgo } });
  const newThisMonth = await User.countDocuments({ role: ROLES.CUSTOMER, deletedAt: null, createdAt: { $gte: monthAgo } });

  // Repeat-customer rate: customers with more than one non-cancelled order,
  // divided by all customers who have placed at least one order.
  const orderCounts = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $group: { _id: '$user', orders: { $sum: 1 } } }
  ]);
  const customersWithOrders = orderCounts.length;
  const repeatCustomers = orderCounts.filter((c) => c.orders > 1).length;
  const repeatCustomerRate = customersWithOrders > 0 ? repeatCustomers / customersWithOrders : 0;

  // Top customers by lifetime spend — useful for a "loyal customers" widget.
  const topCustomersAgg = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $group: { _id: '$user', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, name: '$user.name', phone: '$user.phone', totalSpent: 1, orderCount: 1 } }
  ]);

  return {
    totalCustomers,
    newThisWeek,
    newThisMonth,
    repeatCustomerRate,
    topCustomers: topCustomersAgg
  };
}

// --- 5. Inventory Dashboard & Low Stock Alerts -----------------------------
// Only meaningful for items with stock.trackStock = true — everything else
// is a manual isAvailable on/off item and isn't "inventory" in the numeric
// sense. See models/MenuItem.js stock field for why this is opt-in.
async function getInventoryDashboard() {
  const trackedItems = await MenuItem.find({ 'stock.trackStock': true })
    .select('name stock isAvailable category')
    .populate('category', 'name');

  const outOfStock = trackedItems.filter((i) => i.stock.quantity === 0);
  const lowStock = trackedItems.filter(
    (i) => i.stock.quantity > 0 && i.stock.quantity <= i.stock.lowStockThreshold
  );
  const healthyStock = trackedItems.filter((i) => i.stock.quantity > i.stock.lowStockThreshold);

  const untrackedAvailableCount = await MenuItem.countDocuments({ 'stock.trackStock': false, isAvailable: true });
  const untrackedUnavailableCount = await MenuItem.countDocuments({ 'stock.trackStock': false, isAvailable: false });

  return {
    trackedItemCount: trackedItems.length,
    outOfStock,
    lowStock,
    healthyStock,
    // Items that don't use numeric stock tracking at all — shown as a
    // simple available/unavailable split so the dashboard has a complete
    // picture of the whole catalog, not just the tracked subset.
    untracked: {
      availableCount: untrackedAvailableCount,
      unavailableCount: untrackedUnavailableCount
    }
  };
}

async function getLowStockAlerts() {
  const items = await MenuItem.find({
    'stock.trackStock': true,
    $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
  })
    .select('name stock category')
    .populate('category', 'name')
    .sort({ 'stock.quantity': 1 });

  return items.map((i) => ({
    id: i._id,
    name: i.name,
    category: i.category?.name || null,
    quantity: i.stock.quantity,
    lowStockThreshold: i.stock.lowStockThreshold,
    isOutOfStock: i.stock.quantity === 0
  }));
}

// --- 6. Employee Dashboard --------------------------------------------------
// Orders processed per staff member, derived from statusHistory.updatedBy
// (added in Phase 7 — see models/Order.js). Only counts entries staff
// actually made (updatedBy set) — the initial 'placed' entry and
// customer-initiated cancellations have no updatedBy and are excluded.
async function getEmployeeDashboard({ startDate, endDate } = {}) {
  const matchDate = {};
  if (startDate) matchDate.$gte = startOfDay(startDate);
  if (endDate) matchDate.$lt = addDays(startOfDay(endDate), 1);

  const perStaffAgg = await Order.aggregate([
    { $unwind: '$statusHistory' },
    { $match: { 'statusHistory.updatedBy': { $ne: null }, ...(startDate || endDate ? { 'statusHistory.timestamp': matchDate } : {}) } },
    {
      $group: {
        _id: '$statusHistory.updatedBy',
        actionsCount: { $sum: 1 },
        statusesHandled: { $addToSet: '$statusHistory.status' }
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
    { $unwind: '$staff' },
    {
      $project: {
        _id: 0,
        staffId: '$staff._id',
        name: '$staff.name',
        role: '$staff.role',
        actionsCount: 1,
        statusesHandled: 1
      }
    },
    { $sort: { actionsCount: -1 } }
  ]);

  return { staff: perStaffAgg };
}

// --- 7. Daily & Monthly Reports ---------------------------------------------
async function getDailyReport(dateInput) {
  const date = startOfDay(dateInput || new Date());
  const nextDay = addDays(date, 1);

  const [summary] = await Order.aggregate([
    { $match: { createdAt: { $gte: date, $lt: nextDay }, orderStatus: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
        itemsSubtotal: { $sum: '$itemsSubtotal' },
        deliveryFees: { $sum: '$deliveryFee' },
        discounts: { $sum: '$discountAmount' }
      }
    }
  ]);

  const cancelledCount = await Order.countDocuments({
    createdAt: { $gte: date, $lt: nextDay },
    orderStatus: 'cancelled'
  });

  const { byQuantity } = await getPopularItems({ limit: 5 });

  return {
    date: date.toISOString().slice(0, 10),
    orderCount: summary?.orderCount || 0,
    cancelledCount,
    revenue: summary?.revenue || 0,
    itemsSubtotal: summary?.itemsSubtotal || 0,
    deliveryFees: summary?.deliveryFees || 0,
    discounts: summary?.discounts || 0,
    topItems: byQuantity
  };
}

async function getMonthlyReport({ year, month }) {
  // `month` is 1-12 for a natural API, converted to JS's 0-11 internally.
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || (new Date().getMonth() + 1);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1); // first day of next month

  const dailyBreakdown = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, orderStatus: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orderCount: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', orderCount: 1, revenue: 1 } }
  ]);

  const totals = dailyBreakdown.reduce(
    (acc, d) => ({ orderCount: acc.orderCount + d.orderCount, revenue: acc.revenue + d.revenue }),
    { orderCount: 0, revenue: 0 }
  );

  const cancelledCount = await Order.countDocuments({
    createdAt: { $gte: start, $lt: end },
    orderStatus: 'cancelled'
  });

  return {
    year: y,
    month: m,
    dailyBreakdown,
    totals: {
      ...totals,
      cancelledCount,
      averageOrderValue: totals.orderCount > 0 ? totals.revenue / totals.orderCount : 0
    }
  };
}

module.exports = {
  getDashboardStats,
  getSalesAnalytics,
  getPopularItems,
  getOrderStatistics,
  getCustomerStatistics,
  getInventoryDashboard,
  getLowStockAlerts,
  getEmployeeDashboard,
  getDailyReport,
  getMonthlyReport
};
