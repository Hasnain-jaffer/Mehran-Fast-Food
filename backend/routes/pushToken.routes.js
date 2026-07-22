const express = require('express');
const router = express.Router();

const pushTokenController = require('../controllers/pushToken.controller');
const { authenticate } = require('../middleware/authenticate');

router.post('/', authenticate, pushTokenController.register);

module.exports = router;
