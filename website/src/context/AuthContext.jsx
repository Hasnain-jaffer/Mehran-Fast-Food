/**
 * AuthContext - Global authentication state for the website
 * Manages the access token (in memory only), user data, login/register/logout.
 *
 * SECURITY: neither the access token nor the refresh token is stored in
 * localStorage. The access token lives only in memory (utils/tokenStore.js)
 * for the lifetime of the tab; the refresh token lives only in the
 * httpOnly cookie the backend sets, which JavaScript can never read. On
 * page load there is no token in memory yet, so we silently call
 * /auth/refresh (browser sends the httpOnly cookie automatically) to
 * mint a fresh access token and restore the session — the same thing
 * that already happens transparently on a 401 mid-session.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getAccessToken());
  const [loading, setLoading] = useState(true);

  const setToken = (accessToken) => {
    setAccessToken(accessToken);
    setTokenState(accessToken);
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // On startup, there's no access token in memory yet (a reload wipes it
  // on purpose). Try to silently restore the session from the httpOnly
  // refresh cookie before deciding the user is logged out.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken, user: userData } = res.data;
        setToken(accessToken);
        setUser(userData);
      } catch (err) {
        // No valid refresh cookie (never logged in, expired, or logged
        // out elsewhere) — that's a normal, expected outcome, not an error.
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storeSession = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    clearAccessToken();
  };

  const login = async (phone, password, rememberMe = false) => {
    const res = await axios.post(`${API_URL}/auth/login`, { phone, password, rememberMe });
    const { accessToken, user: userData } = res.data;
    storeSession(accessToken, userData);
    return userData;
  };

  const register = async (name, phone, password) => {
    const res = await axios.post(`${API_URL}/auth/register`, { name, phone, password });
    const { accessToken, user: userData } = res.data;
    storeSession(accessToken, userData);
    return userData;
  };

  const logout = async () => {
    try {
      // Best-effort: invalidate the refresh token server-side too (it
      // reads it from the httpOnly cookie), not just forget it locally,
      // so a leaked refresh token can't be replayed after the user
      // believes they've logged out.
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      // Ignore — we're logging out locally regardless.
    } finally {
      clearSession();
    }
  };

  // "Staff-level" here means anyone who should see the admin panel at all —
  // exact permissions within the panel should still be checked per-action
  // against the more specific role, but this gate matches the backend's
  // STAFF_LEVEL role set (constants/roles.js) so it doesn't silently drift
  // out of sync as new operational roles are added.
  const STAFF_LEVEL_ROLES = ['kitchenStaff', 'cashier', 'delivery', 'support', 'staff', 'manager', 'admin', 'superAdmin'];
  const isAdmin = STAFF_LEVEL_ROLES.includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
