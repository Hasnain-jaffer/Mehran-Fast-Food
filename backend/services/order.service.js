const Order = require('../models/Order');
const User = require('../models/User');
const Deal = require('../models/Deal');
const MenuItem = require('../models/MenuItem');
const { ApiError } = require('../utils/ApiError');
const { ROLES } = require('../constants/roles');
const { DELIVERY_FEE, MIN_ORDER_AMOUNT, STRIPE_CURRENCY } = require('../constants/payment');
const { getStripe, isStripeConfigured } = require('../config/stripe');
const couponService = require('./coupon.service');
const { sendNewOrderAlert, sendOrderStatusNotification } = require('../utils/pushNotifications');

// Atomically decrements stock only if enough is available, in one database
// round trip (`$gte` in the filter + `$inc` in the update) — avoids a
// classic race condition where two simultaneous orders both read "3 left",
// both decide it's enough, and both proceed, overselling stock.
async function tryDecrementStock(menuItemId, quantity) {
  const result = await MenuItem.findOneAndUpdate(
    { _id: menuItemId, 'stock.trackStock': true, 'stock.quantity': { $gte: quantity } },
    { $inc: { 'stock.quantity': -quantity } }
  );
  return !!result;
}

async function restoreStock(menuItemId, quantity) {
  await MenuItem.updateOne(
    { _id: menuItemId, 'stock.trackStock': true },
    { $inc: { 'stock.quantity': quantity } }
  );
}

// SECURITY: never trust price/totalAmount from the client. Every line item's
// price is looked up fresh from the database, and totalAmount is computed
// here — the only place an order total is ever calculated. The client may
// only send *selections* (which variant, which add-ons by name) — the
// actual priceDelta/price for each is always re-resolved from the menu
// item itself, exactly like the base price already was.
async function buildOrderItems(requestedItems) {
  const items = [];
  let itemsSubtotal = 0;
  // Tracks stock decrements already applied so they can be rolled back if
  // a LATER item in the same order request fails — a failed order should
  // never leave some items' stock silently decremented.
  const appliedStockDecrements = [];

  try {
    for (const requested of requestedItems) {
      const { refType, refId, qty, variantName, addOns: requestedAddOns } = requested;
      const quantity = Number(qty) > 0 ? Number(qty) : 1;

      const source = refType === 'deal'
        ? await Deal.findById(refId)
        : await MenuItem.findById(refId);

      if (!source || source.isAvailable === false) {
        throw new ApiError(400, `Item unavailable: ${requested.name || refId}`);
      }

      let unitPrice = source.price;
      let resolvedVariantName = null;
      let resolvedAddOns = [];

      // Deals don't have variants/add-ons — selections are only meaningful
      // for menuItem lines, so silently ignore them for deals rather than
      // erroring (a stale cart item shouldn't block checkout).
      if (refType === 'menuItem') {
        if (variantName) {
          const variant = (source.variants || []).find((v) => v.name === variantName);
          if (!variant) {
            throw new ApiError(400, `Invalid variant "${variantName}" for ${source.name}`);
          }
          unitPrice += variant.priceDelta || 0;
          resolvedVariantName = variant.name;
        }

        if (Array.isArray(requestedAddOns) && requestedAddOns.length > 0) {
          for (const addOnName of requestedAddOns) {
            const addOn = (source.addOns || []).find((a) => a.name === addOnName);
            if (!addOn || addOn.isAvailable === false) {
              throw new ApiError(400, `Add-on "${addOnName}" unavailable for ${source.name}`);
            }
            unitPrice += addOn.price;
            resolvedAddOns.push({ name: addOn.name, price: addOn.price });
          }
        }

        if (source.stock?.trackStock) {
          const ok = await tryDecrementStock(source._id, quantity);
          if (!ok) {
            throw new ApiError(409, `Insufficient stock for ${source.name}`);
          }
          appliedStockDecrements.push({ menuItemId: source._id, quantity });
        }
      }

      const lineItem = {
        refType,
        refId: source._id,
        name: source.title || source.name,
        variantName: resolvedVariantName,
        addOns: resolvedAddOns,
        qty: quantity,
        price: unitPrice,
        image: source.image || ''
      };
      items.push(lineItem);
      itemsSubtotal += lineItem.price * quantity;
    }
  } catch (err) {
    // Roll back any stock already decremented earlier in this same order
    // request before propagating the error — otherwise a customer whose
    // order fails on item #3 would still have "lost" stock for items #1-2.
    await Promise.allSettled(
      appliedStockDecrements.map((d) => restoreStock(d.menuItemId, d.quantity))
    );
    throw err;
  }

  return { items, itemsSubtotal };
}

async function createOrder({ user, deliveryAddress, phone, paymentMethod, requestedItems, couponCode }) {
  if (user.role !== ROLES.CUSTOMER) {
    throw new ApiError(403, 'Only customers can place orders');
  }

  const method = paymentMethod || 'COD';
  if (method === 'card' && !isStripeConfigured()) {
    throw new ApiError(503, 'Card payments are not available right now — please choose Cash on Delivery.');
  }

  const { items, itemsSubtotal } = await buildOrderItems(requestedItems);

  if (itemsSubtotal < MIN_ORDER_AMOUNT) {
    throw new ApiError(400, `Minimum order amount is Rs. ${MIN_ORDER_AMOUNT} (items subtotal, before delivery). Add a few more items.`);
  }

  // Re-validate the coupon here rather than trusting a discount amount
  // computed earlier by /coupons/validate — the cart could have changed
  // (items added/removed) between that check and actually placing the
  // order, and the coupon's own limits could have been hit by someone
  // else in the meantime.
  let coupon = null;
  let discountAmount = 0;
  if (couponCode) {
    coupon = await couponService.findValidCoupon({ code: couponCode, user, itemsSubtotal });
    discountAmount = couponService.computeDiscount(coupon, itemsSubtotal);
  }

  const deliveryFee = DELIVERY_FEE;
  const totalAmount = itemsSubtotal - discountAmount + deliveryFee;

  const order = await Order.create({
    user: user._id,
    items,
    itemsSubtotal,
    deliveryFee,
    couponCode: coupon ? coupon.code : null,
    discountAmount,
    totalAmount,
    deliveryAddress,
    phone: phone || user.phone,
    paymentMethod: method,
    // COD is "pending" until delivered (cash changes hands at the door —
    // see updateOrderStatus). Card starts "pending" too, and only flips to
    // "paid" once Stripe's webhook confirms the PaymentIntent succeeded —
    // never based on anything the client claims here.
    paymentStatus: 'pending',
    orderStatus: 'placed',
    statusHistory: [{ status: 'placed', timestamp: new Date() }]
  });

  if (coupon) {
    await couponService.recordUsage(coupon, { user, order });
  }

  let clientSecret = null;
  if (method === 'card') {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount), // PKR has no minor unit — Stripe expects the smallest currency unit
      currency: STRIPE_CURRENCY,
      metadata: { orderId: order._id.toString(), userId: user._id.toString() }
    });
    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();
    clientSecret = paymentIntent.client_secret;
  }

  await order.populate('user', 'name phone pushToken');

  // Best-effort notification fan-out to staff/admin devices — failures here
  // shouldn't fail the order itself, so this is intentionally not awaited
  // inside a try/catch that would reject the whole request.
  const staffUsers = await User.find({
    role: { $in: ['admin', 'staff', 'superAdmin'] },
    pushToken: { $ne: null }
  });
  await Promise.allSettled(
    staffUsers.map((staff) => sendNewOrderAlert(staff.pushToken, order._id, totalAmount))
  );

  return { order, clientSecret };
}

async function listOrdersForCustomer(userId) {
  return Order.find({ user: userId }).sort({ createdAt: -1 }).populate('user', 'name phone');
}

async function listOrders({ status, page, limit }) {
  const filter = status ? { orderStatus: status } : {};

  if (page) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .populate('user', 'name phone'),
      Order.countDocuments(filter)
    ]);
    return { orders, total, page: pageNum, pages: Math.ceil(total / pageSize) };
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user', 'name phone');
  return orders;
}

async function getOrderById({ orderId, user }) {
  const order = await Order.findById(orderId).populate('user', 'name phone pushToken');
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  const isOwner = order.user?._id?.toString() === user._id.toString();
  const isStaff = user.role !== ROLES.CUSTOMER;
  if (!isOwner && !isStaff) {
    throw new ApiError(403, 'You do not have access to this order');
  }
  return order;
}

async function updateOrderStatus({ orderId, status, note, updatedByUserId }) {
  const order = await Order.findById(orderId).populate('user');
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const wasAlreadyCancelled = order.orderStatus === 'cancelled';

  order.orderStatus = status;
  order.statusHistory.push({ status, timestamp: new Date(), note: note || '', updatedBy: updatedByUserId || null });

  // Cash physically changes hands at the door, so there's no webhook to
  // tell us a COD order was paid — "delivered" is the signal instead.
  // Card orders are left alone here; their paymentStatus only ever moves
  // via the Stripe webhook (see payment.controller.js), never by staff
  // marking a status, so a staff mistake can't be mistaken for a real charge.
  if (status === 'delivered' && order.paymentMethod === 'COD' && order.paymentStatus === 'pending') {
    order.paymentStatus = 'paid';
  }

  await order.save();

  // Give back any stock this order had reserved when staff cancel it too —
  // guarded so this only fires once (not on every subsequent save of an
  // already-cancelled order).
  if (status === 'cancelled' && !wasAlreadyCancelled) {
    await Promise.allSettled(
      order.items
        .filter((item) => item.refType === 'menuItem')
        .map((item) => restoreStock(item.refId, item.qty))
    );
  }

  if (order.user?.pushToken) {
    await sendOrderStatusNotification(order.user, order._id, status).catch(() => {});
  }

  return order;
}

// Customer-initiated cancellation. Deliberately narrow: only the order's
// own owner, and only while it's still 'placed' — once staff have
// confirmed it, the kitchen may already be acting on it, so cancellation
// past that point has to go through staff/admin instead.
async function cancelOrder({ orderId, user }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.user.toString() !== user._id.toString()) {
    throw new ApiError(403, 'You can only cancel your own orders');
  }
  if (order.orderStatus !== 'placed') {
    throw new ApiError(400, 'This order can no longer be cancelled — it has already been confirmed. Please contact the shop directly.');
  }

  // If a card payment already went through before the cancellation request
  // landed, refund it — a cancelled order should never leave money charged.
  if (order.paymentMethod === 'card' && order.paymentStatus === 'paid' && order.stripePaymentIntentId) {
    const stripe = getStripe();
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    order.paymentStatus = 'refunded';
  }

  order.orderStatus = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: 'Cancelled by customer' });
  await order.save();

  if (order.couponCode) {
    await couponService.releaseUsage(order.couponCode, order._id);
  }

  // Give back any stock this order had reserved — a cancelled order
  // should never permanently shrink stock for nothing.
  await Promise.allSettled(
    order.items
      .filter((item) => item.refType === 'menuItem')
      .map((item) => restoreStock(item.refId, item.qty))
  );

  return order;
}

// Called only from the Stripe webhook handler — never from a client
// request — since paymentStatus for card orders must only ever reflect
// what Stripe actually confirmed happened.
async function markPaymentStatusByIntentId(stripePaymentIntentId, paymentStatus) {
  const order = await Order.findOne({ stripePaymentIntentId });
  if (!order) return null;
  order.paymentStatus = paymentStatus;
  await order.save();
  return order;
}

module.exports = {
  buildOrderItems,
  createOrder,
  listOrdersForCustomer,
  listOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  markPaymentStatusByIntentId
};
