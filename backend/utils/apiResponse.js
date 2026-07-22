/**
 * Standardized API response helper.
 *
 * WHY additive, not a breaking rewrite: the existing frontend (website,
 * and any future mobile client) already reads specific fields directly —
 * e.g. `res.data.user`, `res.data.accessToken`. Wrapping every response in
 * a new `{ success, data: {...} }` envelope and *removing* the old
 * top-level fields would break every existing API consumer in one shot.
 *
 * Instead, this adds a `success` boolean to every response (success:true
 * for 2xx, success:false for errors — the latter is added in
 * middleware/errorHandler.js) while leaving all existing fields exactly
 * where they already are. Old clients that don't look at `success` keep
 * working unchanged; new/future clients get a consistent, documented
 * shape to branch on: `{ success, message, ...data }`.
 */

function sendSuccess(res, statusCode, payload = {}) {
  return res.status(statusCode).json({ success: true, ...payload });
}

module.exports = { sendSuccess };
