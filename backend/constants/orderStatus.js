const ORDER_STATUSES = Object.freeze([
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled'
]);

const ACTIVE_ORDER_STATUSES = ['placed', 'confirmed', 'preparing'];

module.exports = { ORDER_STATUSES, ACTIVE_ORDER_STATUSES };
