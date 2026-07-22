/**
 * A thrown error that carries an HTTP status code.
 * Lets controllers do `throw new ApiError(404, 'Order not found')` instead
 * of manually calling res.status().json() everywhere and forgetting to
 * `return` afterwards (a real bug class in the old route files).
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { ApiError };
