/**
 * API utility - Axios instance with base URL.
 *
 * Auth model:
 * - Access token lives in memory only (utils/tokenStore.js) — never in
 *   localStorage, so it isn't readable by an XSS payload.
 * - Refresh token lives ONLY in the httpOnly cookie the backend sets
 *   (see backend/utils/cookies.js). We never read or store it in JS at
 *   all here, and never send one in the request body — `withCredentials`
 *   makes the browser attach the cookie automatically.
 * - On a 401, we call /auth/refresh with an empty body; the server reads
 *   the refresh token from the cookie, and we store the new access token
 *   back in memory.
 */
import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Sends/receives the httpOnly refresh-token cookie the backend sets.
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/register')
      || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // De-duplicate concurrent refreshes — several requests can hit a
        // 401 at once; only refresh once and let the rest wait on it.
        // No body needed — the refresh token travels via the httpOnly
        // cookie, sent automatically because of withCredentials.
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => { refreshPromise = null; });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
