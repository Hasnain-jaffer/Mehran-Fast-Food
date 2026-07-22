const express = require('express');
const router = express.Router();

const couponController = require('../controllers/coupon.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { ADMIN_LEVEL } = require('../constants/roles');
const {
  couponCreateValidators,
  couponUpdateValidators,
  couponValidateValidators
} = require('../validators/coupon.validators');

// Requires login (not just "public") since eligibility depends on the
// customer's own past usage of the code.
router.post('/validate', authenticate, couponValidateValidators, validate, couponController.validateCoupon);

router.get('/', authenticate, authorize(...ADMIN_LEVEL), couponController.list);
router.post('/', authenticate, authorize(...ADMIN_LEVEL), couponCreateValidators, validate, couponController.create);
router.patch('/:id', authenticate, authorize(...ADMIN_LEVEL), couponUpdateValidators, validate, couponController.update);
router.delete('/:id', authenticate, authorize(...ADMIN_LEVEL), couponController.remove);

module.exports = router;
