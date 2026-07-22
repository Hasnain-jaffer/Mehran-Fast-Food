/**
 * Cookie-based refresh token transport (optional, additive).
 *
 * WHY optional rather than a full switch to cookies: this API serves both
 * a browser website and a future React Native mobile app. Mobile apps
 * can't rely on browser cookies, so the refresh token is still always
 * returned in the response body (as it already was). For the *website*
 * specifically, storing the refresh token in an httpOnly cookie in
 * addition is strictly more secure than body-only: JavaScript (and by
 * extension, an XSS payload) cannot read an httpOnly cookie, whereas it
 * CAN read anything the website itself stored in localStorage.
 *
 * The refresh endpoint accepts the token from EITHER the cookie OR the
 * request body — whichever is present — so this never breaks a client
 * that only knows about the body-based flow.
 */

const COOKIE_NAME = 'mehran_refresh_token';

function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in production
    // 'none' is required in production because the frontend (Vercel) and
    // backend (Render) are different domains — this is a cross-site request
    // from the browser's point of view. 'none' MUST be paired with
    // secure: true (above), or browsers will reject the cookie outright.
    // In local dev, frontend and backend are both on localhost (different
    // ports only), so 'lax' is fine and avoids needing HTTPS locally.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth', // only sent to auth endpoints, not the whole API
    maxAge: 30 * 24 * 60 * 60 * 1000 // upper bound; actual token TTL is enforced server-side regardless
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(COOKIE_NAME, refreshToken, refreshTokenCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...refreshTokenCookieOptions(), maxAge: undefined });
}

function getRefreshTokenFromRequest(req) {
  return req.body?.refreshToken || req.cookies?.[COOKIE_NAME] || null;
}

module.exports = { COOKIE_NAME, setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromRequest };
