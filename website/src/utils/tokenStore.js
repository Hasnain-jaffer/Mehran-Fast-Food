/**
 * In-memory access token store.
 *
 * WHY not localStorage: anything in localStorage is readable by any JS
 * running on the page — including an XSS payload. The refresh token was
 * already moved to an httpOnly cookie by the backend (see
 * backend/utils/cookies.js) specifically so JS can't touch it; keeping the
 * access token here (a plain module variable, cleared on refresh/tab
 * close) closes the other half of that gap. A page reload loses this
 * value on purpose — AuthContext silently calls /auth/refresh on startup
 * (which relies on the httpOnly cookie, sent automatically by the
 * browser) to get a fresh access token instead of persisting one.
 */

let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
