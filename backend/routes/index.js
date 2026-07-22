const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/categories', require('./category.routes'));
router.use('/deals', require('./deal.routes'));
router.use('/menu-items', require('./menuItem.routes'));
router.use('/orders', require('./order.routes'));
router.use('/coupons', require('./coupon.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/admin/stats', require('./stats.routes'));
router.use('/push-token', require('./pushToken.routes'));

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
