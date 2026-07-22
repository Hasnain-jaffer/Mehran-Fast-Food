/**
 * Wraps an async Express handler so thrown errors (including from
 * `await`) are automatically forwarded to next(), instead of every single
 * controller needing its own try/catch { res.status(500)... } block.
 * This was the single most duplicated pattern in the old codebase.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
