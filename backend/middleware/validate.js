const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

// Runs after a chain of express-validator checks; turns accumulated
// validation errors into a single consistent 400 response.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }
  next();
};

module.exports = { validate };
