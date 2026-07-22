const express = require('express');
const router = express.Router();

const dealController = require('../controllers/deal.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { dealValidators } = require('../validators/catalog.validators');
const { STAFF_LEVEL } = require('../constants/roles');

router.get('/', dealController.list);
router.get('/:id', dealController.getById);
router.post('/', authenticate, authorize(...STAFF_LEVEL), dealValidators, validate, dealController.create);
router.put('/:id', authenticate, authorize(...STAFF_LEVEL), dealValidators, validate, dealController.update);
router.delete('/:id', authenticate, authorize(...STAFF_LEVEL), dealController.remove);

module.exports = router;
