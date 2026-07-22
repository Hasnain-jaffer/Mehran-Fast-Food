const orderService = require('../services/order.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { DELIVERY_FEE, MIN_ORDER_AMOUNT } = require('../constants/payment');
const { isStripeConfigured } = require('../config/stripe');

const create = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, phone, paymentMethod, couponCode } = req.body;
  const { order, clientSecret } = await orderService.createOrder({
    user: req.user,
    deliveryAddress,
    phone,
    paymentMethod,
    requestedItems: items,
    couponCode
  });
  res.status(201).json({ order, clientSecret });
});

const listMine = asyncHandler(async (req, res) => {
  const orders = await orderService.listOrdersForCustomer(req.user._id);
  res.json(orders);
});

const list = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await orderService.listOrders({ status, page, limit });
  res.json(result);
});

const getById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById({ orderId: req.params.id, user: req.user });
  res.json(order);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await orderService.updateOrderStatus({
    orderId: req.params.id,
    status,
    note,
    updatedByUserId: req.user._id
  });
  res.json(order);
});

const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder({ orderId: req.params.id, user: req.user });
  res.json(order);
});

// Public — lets the cart page show/enforce delivery fee and minimum order
// without hardcoding a copy of these numbers into the frontend.
const checkoutInfo = asyncHandler(async (req, res) => {
  res.json({ deliveryFee: DELIVERY_FEE, minOrderAmount: MIN_ORDER_AMOUNT, cardPaymentAvailable: isStripeConfigured() });
});

module.exports = { create, listMine, list, getById, updateStatus, cancel, checkoutInfo };
