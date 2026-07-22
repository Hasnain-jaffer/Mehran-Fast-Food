const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { categoryValidators } = require('../validators/catalog.validators');
const { STAFF_LEVEL } = require('../constants/roles');

router.get('/', categoryController.list);
router.post('/', authenticate, authorize(...STAFF_LEVEL), categoryValidators, validate, categoryController.create);
router.put('/:id', authenticate, authorize(...STAFF_LEVEL), categoryValidators, validate, categoryController.update);
router.delete('/:id', authenticate, authorize(...STAFF_LEVEL), categoryController.remove);

module.exports = router;
