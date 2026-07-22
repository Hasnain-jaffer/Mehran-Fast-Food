const { ApiError } = require('../utils/ApiError');

/**
 * Centralized error handler. Every controller/service throws (via
 * asyncHandler forwarding) instead of formatting its own response — this
 * is the only place that decides what an error looks like on the wire.
 * Keeping this in one file means the response shape can never drift
 * between routes, and we never leak stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong!';
  let details = err.details;

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key error (e.g. phone number already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${field} already in use`;
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'Origin not allowed';
  }

  // Multer (file upload) errors — e.g. file too large, wrong field name.
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image is too large (max 5MB)'
      : `Upload error: ${err.message}`;
  }

  if (statusCode >= 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 && { error: err.message })
  });
};

module.exports = { errorHandler };
