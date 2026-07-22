const express = require('express');
const router = express.Router();

const menuItemController = require('../controllers/menuItem.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { menuItemValidators } = require('../validators/catalog.validators');
const { STAFF_LEVEL } = require('../constants/roles');

router.get('/', menuItemController.list);
router.post('/', authenticate, authorize(...STAFF_LEVEL), menuItemValidators, validate, menuItemController.create);
router.put('/:id', authenticate, authorize(...STAFF_LEVEL), menuItemValidators, validate, menuItemController.update);
router.delete('/:id', authenticate, authorize(...STAFF_LEVEL), menuItemController.remove);

module.exports = router;
