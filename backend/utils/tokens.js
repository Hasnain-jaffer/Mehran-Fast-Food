const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRY || '15m';

// Two refresh lifetimes: a short "session only" one for normal logins, and
// a long one for "remember me" logins. Both are configurable via env so
// this can be tuned per deployment without a code change.
const REFRESH_TOKEN_TTL_DAYS_DEFAULT = Number(process.env.JWT_REFRESH_EXPIRY_DAYS || 7);
const REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME = Number(process.env.JWT_REFRESH_EXPIRY_DAYS_REMEMBER_ME || 30);

function refreshTtlDays(rememberMe) {
  return rememberMe ? REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME : REFRESH_TOKEN_TTL_DAYS_DEFAULT;
}

function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user, tokenId, rememberMe = false) {
  return jwt.sign(
    { userId: user._id.toString(), tokenId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${refreshTtlDays(rememberMe)}d` }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Refresh tokens are hashed with SHA-256 before being stored in MongoDB.
// This is cheap (unlike bcrypt) because refresh tokens are already
// high-entropy random-looking JWTs — SHA-256 is appropriate here and fast
// enough to run on every refresh request. If the database is ever leaked,
// the stored hashes are useless without the original token.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newTokenId() {
  return crypto.randomUUID();
}

function refreshExpiryDate(rememberMe = false) {
  return new Date(Date.now() + refreshTtlDays(rememberMe) * 24 * 60 * 60 * 1000);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  newTokenId,
  refreshExpiryDate,
  refreshTtlDays,
  REFRESH_TOKEN_TTL_DAYS_DEFAULT,
  REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME
};
