/**
 * Auth Service
 *
 * All authentication business logic lives here, not in the controller.
 * Controllers stay thin (parse request -> call service -> send response);
 * this makes the logic unit-testable without spinning up Express, and
 * reusable if we ever add e.g. a Google OAuth login path later.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { DEFAULT_SELF_REGISTER_ROLE, STAFF_ROLES } = require('../constants/roles');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newTokenId,
  refreshExpiryDate
} = require('../utils/tokens');

const MAX_LOGIN_HISTORY = 25;

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    addresses: user.addresses,
    pushToken: user.pushToken,
    profileImage: user.profileImage,
    favorites: user.favorites,
    createdAt: user.createdAt
  };
}

function labelDevice(userAgent = '') {
  const ua = userAgent || '';
  let os = 'Unknown device';
  if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os/i.test(ua)) os = 'Mac';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';

  return browser ? (browser + ' on ' + os) : os;
}

async function issueTokenPair(user, opts) {
  opts = opts || {};
  const userAgent = opts.userAgent || '';
  const ip = opts.ip || '';
  const rememberMe = !!opts.rememberMe;

  const tokenId = newTokenId();
  const refreshToken = signRefreshToken(user, tokenId, rememberMe);
  const accessToken = signAccessToken(user);

  user.refreshTokens = (user.refreshTokens || []).filter((t) => t.expiresAt > new Date());
  user.refreshTokens.push({
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(rememberMe),
    userAgent: userAgent.slice(0, 200),
    ip: ip.slice(0, 100),
    rememberMe,
    createdAt: new Date(),
    lastUsedAt: new Date()
  });
  await user.save();

  return { accessToken, refreshToken };
}

function recordLoginAttempt(user, opts) {
  const ip = opts.ip || '';
  const userAgent = opts.userAgent || '';
  const success = opts.success;
  const reason = opts.reason || '';

  user.loginHistory = user.loginHistory || [];
  user.loginHistory.push({ timestamp: new Date(), ip, userAgent, success, reason });
  if (user.loginHistory.length > MAX_LOGIN_HISTORY) {
    user.loginHistory = user.loginHistory.slice(-MAX_LOGIN_HISTORY);
  }
}

async function register({ name, phone, password }) {
  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    throw new ApiError(409, 'Phone number already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    phone,
    passwordHash,
    role: DEFAULT_SELF_REGISTER_ROLE
  });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

async function login({ phone, password, userAgent = '', ip = '', rememberMe = false }) {
  const user = await User.findOne({ phone, deletedAt: null }).select('+passwordHash +loginHistory');

  if (!user) {
    throw new ApiError(401, 'Invalid phone or password');
  }

  if (!user.isActive) {
    recordLoginAttempt(user, { ip, userAgent, success: false, reason: 'account_disabled' });
    await user.save();
    throw new ApiError(403, 'This account has been disabled. Contact support.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    recordLoginAttempt(user, { ip, userAgent, success: false, reason: 'invalid_password' });
    await user.save();
    throw new ApiError(401, 'Invalid phone or password');
  }

  user.lastLogin = new Date();
  recordLoginAttempt(user, { ip, userAgent, success: true });
  const tokens = await issueTokenPair(user, { userAgent, ip, rememberMe });

  return { user: toPublicUser(user), ...tokens };
}

async function refresh({ refreshToken, userAgent = '', ip = '' }) {
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const incomingHash = hashToken(refreshToken);
  const stored = user.refreshTokens.find(
    (t) => t.tokenId === decoded.tokenId && t.tokenHash === incomingHash
  );

  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== decoded.tokenId);
  const tokens = await issueTokenPair(user, { userAgent, ip, rememberMe: stored.rememberMe });

  return { user: toPublicUser(user), ...tokens };
}

async function logout({ userId, refreshToken }) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== decoded.tokenId);
      await user.save();
    } catch (err) {
      // Token already invalid/expired — nothing to invalidate.
    }
  }
}

async function logoutAll(userId) {
  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
}

async function listSessions({ userId, currentTokenId = null }) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) throw new ApiError(404, 'User not found');

  const now = new Date();
  const active = (user.refreshTokens || []).filter((t) => t.expiresAt > now);

  return active
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .map((t) => ({
      id: t.tokenId,
      device: labelDevice(t.userAgent),
      ip: t.ip,
      rememberMe: t.rememberMe,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      expiresAt: t.expiresAt,
      isCurrent: t.tokenId === currentTokenId
    }));
}

async function revokeSession({ userId, sessionId }) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) throw new ApiError(404, 'User not found');

  const before = user.refreshTokens.length;
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== sessionId);

  if (user.refreshTokens.length === before) {
    throw new ApiError(404, 'Session not found');
  }

  await user.save();
}

async function getLoginHistory(userId) {
  const user = await User.findById(userId).select('+loginHistory');
  if (!user) throw new ApiError(404, 'User not found');
  return [...(user.loginHistory || [])].reverse();
}

async function updateUserRole({ targetUserId, role }) {
  const user = await User.findByIdAndUpdate(
    targetUserId,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return toPublicUser(user);
}

async function createStaffAccount({ name, phone, password, role, createdByUserId }) {
  if (!STAFF_ROLES.includes(role)) {
    throw new ApiError(400, 'Role must be one of: ' + STAFF_ROLES.join(', '));
  }

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    throw new ApiError(409, 'Phone number already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    phone,
    passwordHash,
    role,
    createdBy: createdByUserId
  });

  return toPublicUser(user);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  getLoginHistory,
  updateUserRole,
  createStaffAccount,
  toPublicUser,
  labelDevice
};
