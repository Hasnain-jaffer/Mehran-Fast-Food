/**
 * Authentication middleware.
 *
 * WHY split from authorization: the old `middleware/auth.js` mixed "who are
 * you" (authentication) with "are you allowed" (authorization) in the same
 * file, which is how role-checking logic ends up duplicated and
 * inconsistent across routes. This file answers ONE question: is there a
 * valid access token, and does it belong to an active user? Nothing here
 * knows what a "role" is.
 */

const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token.');
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.deletedAt) {
    // Treat a soft-deleted account exactly like a nonexistent one — same
    // error, so a leaked/cached access token for a deleted account can't
    // be used to distinguish "deleted" from "never existed".
    throw new ApiError(401, 'User not found.');
  }

  // A disabled account should lose access immediately, even with a
  // still-valid, not-yet-expired access token.
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been disabled. Contact support.');
  }

  req.user = user;
  next();
});

module.exports = { authenticate };
