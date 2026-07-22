const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/review.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { ADMIN_LEVEL } = require('../constants/roles');
const { reviewCreateValidators, reviewListValidators } = require('../validators/review.validators');

// Public — anyone browsing the menu should see ratings without logging in.
router.get('/', reviewListValidators, validate, reviewController.list);
router.get('/summary', reviewListValidators, validate, reviewController.summary);
router.get('/summary-bulk', reviewController.summaryBulk);

router.get('/mine', authenticate, reviewController.listMine);
router.post('/', authenticate, reviewCreateValidators, validate, reviewController.create);
router.delete('/:id', authenticate, reviewController.remove);
router.patch('/:id/visibility', authenticate, authorize(...ADMIN_LEVEL), reviewController.setHidden);

module.exports = router;
