const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { orderStatusValidators, createOrderValidators } = require('../validators/order.validators');
const { STAFF_LEVEL } = require('../constants/roles');

// Public — the cart page needs this before the user is even logged in.
router.get('/checkout-info', orderController.checkoutInfo);

router.post('/', authenticate, createOrderValidators, validate, orderController.create);
router.get('/my', authenticate, orderController.listMine);
router.get('/', authenticate, authorize(...STAFF_LEVEL), orderController.list);
router.get('/:id', authenticate, orderController.getById);
router.patch('/:id/cancel', authenticate, orderController.cancel);
router.patch(
  '/:id/status',
  authenticate,
  authorize(...STAFF_LEVEL),
  orderStatusValidators,
  validate,
  orderController.updateStatus
);

module.exports = router;
