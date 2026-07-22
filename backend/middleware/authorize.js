/**
 * Reusable role-based access control.
 *
 * WHY: the old codebase had `requireAdmin` and `requireAdminOrStaff` as two
 * separate, hand-written middleware functions. Every new role (like
 * superAdmin) would have meant writing yet another one, and it's easy for
 * these to drift out of sync (e.g. someone adds 'superAdmin' to the model
 * enum but forgets to update `requireAdminOrStaff`). A single factory
 * function scales to any number of roles with zero duplication.
 *
 * Usage: router.post('/', authenticate, authorize('admin', 'staff'), ...)
 *
 * This assumes `authenticate` has already run and set `req.user` — the two
 * are intentionally decoupled so authorization never silently trusts a
 * token that hasn't been verified.
 */

const { ApiError } = require('../utils/ApiError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    // Defensive: this should never trigger if `authenticate` runs first,
    // but guarantees authorize() never fails open.
    throw new ApiError(401, 'Authentication required.');
  }

  if (!allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, `Access denied. Requires one of: ${allowedRoles.join(', ')}.`);
  }

  next();
};

module.exports = { authorize };
