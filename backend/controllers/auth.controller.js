const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromRequest } = require('../utils/cookies');

// req.ip respects Express's `trust proxy` setting — set in app.js when
// deployed behind a reverse proxy/load balancer, so this reflects the real
// client IP rather than the proxy's.
function clientIp(req) {
  return req.ip || req.connection?.remoteAddress || '';
}

// The access token is always returned in the response body — it's short
// lived (15 min) and safe to hold in memory/localStorage. The refresh
// token is ALSO always returned in the body (required for mobile clients,
// which can't use browser cookies), but for browser clients we
// additionally set it as an httpOnly cookie. httpOnly means client-side
// JavaScript (including an XSS payload) cannot read it — a real security
// improvement for the website specifically, layered on top of the
// body-based flow rather than replacing it.
const register = asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body;
  const result = await authService.register({ name, phone, password });
  setRefreshTokenCookie(res, result.refreshToken);
  sendSuccess(res, 201, { message: 'User registered successfully', ...result });
});

const login = asyncHandler(async (req, res) => {
  const { phone, password, rememberMe } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const result = await authService.login({
    phone,
    password,
    userAgent,
    ip: clientIp(req),
    rememberMe: !!rememberMe
  });
  setRefreshTokenCookie(res, result.refreshToken);
  sendSuccess(res, 200, { message: 'Login successful', ...result });
});

const refresh = asyncHandler(async (req, res) => {
  // Accept the refresh token from either the httpOnly cookie (website) or
  // the request body (mobile / any client not using cookies) — whichever
  // is present. This keeps both transports working without the client
  // needing to know which one the server prefers.
  const refreshToken = getRefreshTokenFromRequest(req);
  const userAgent = req.headers['user-agent'] || '';
  const result = await authService.refresh({ refreshToken, userAgent, ip: clientIp(req) });
  setRefreshTokenCookie(res, result.refreshToken);
  sendSuccess(res, 200, { message: 'Token refreshed', ...result });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  await authService.logout({ userId: req.user._id, refreshToken });
  clearRefreshTokenCookie(res);
  sendSuccess(res, 200, { message: 'Logged out successfully' });
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  clearRefreshTokenCookie(res);
  sendSuccess(res, 200, { message: 'Logged out of all devices' });
});

const me = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, { user: authService.toPublicUser(req.user) });
});

// Lists this user's active sessions/devices (one entry per valid refresh
// token). NOTE: since access tokens don't carry a session/tokenId, we
// can't reliably flag "which session is this exact request" from an
// access-token-only call — the client can optionally pass its current
// refresh token's session id via ?currentSessionId= (a non-sensitive
// tokenId, not the token itself) to have it flagged as `isCurrent: true`.
const listSessions = asyncHandler(async (req, res) => {
  const currentTokenId = req.query.currentSessionId || null;
  const sessions = await authService.listSessions({ userId: req.user._id, currentTokenId });
  sendSuccess(res, 200, { sessions });
});

const revokeSession = asyncHandler(async (req, res) => {
  await authService.revokeSession({ userId: req.user._id, sessionId: req.params.sessionId });
  sendSuccess(res, 200, { message: 'Session revoked' });
});

const loginHistory = asyncHandler(async (req, res) => {
  const history = await authService.getLoginHistory(req.user._id);
  sendSuccess(res, 200, { history });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  // Prevent an admin from accidentally (or maliciously) demoting/escalating
  // their own account through this endpoint — role changes to yourself
  // must happen through a separate, more deliberate process.
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own role.');
  }

  const user = await authService.updateUserRole({ targetUserId: req.params.id, role });
  sendSuccess(res, 200, { message: 'Role updated', user });
});

// Admin/manager-only: directly create a staff account (kitchenStaff,
// cashier, delivery, support, manager, staff) with a password the admin
// sets — distinct from public self-registration, which can only ever
// create customers.
const createStaffAccount = asyncHandler(async (req, res) => {
  const { name, phone, password, role } = req.body;
  const user = await authService.createStaffAccount({
    name,
    phone,
    password,
    role,
    createdByUserId: req.user._id
  });
  sendSuccess(res, 201, { message: 'Staff account created', user });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  listSessions,
  revokeSession,
  loginHistory,
  updateUserRole,
  createStaffAccount
};
