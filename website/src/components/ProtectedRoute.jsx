/**
 * Route guards.
 *
 * Previously /admin, /admin/orders, /admin/menu, /admin/categories and
 * /admin/coupons were mounted directly with no client-side check at all —
 * anyone who typed the URL got the admin UI, and every data fetch inside
 * it would only fail once it hit the backend. That's both a bad user
 * experience (a blank/broken dashboard instead of a clean redirect) and
 * bad practice: the client should never render a privileged screen for a
 * user it doesn't yet know is privileged.
 *
 * The backend was already doing real authorization correctly
 * (authenticate + authorize middleware, see backend/middleware/) — these
 * guards just make the frontend match that, so unauthorized users are
 * redirected before the admin UI ever mounts, instead of relying on API
 * calls to fail after the fact.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STAFF_LEVEL_ROLES = ['kitchenStaff', 'cashier', 'delivery', 'support', 'staff', 'manager', 'admin', 'superAdmin'];

// Any logged-in user (customer or staff) — used for pages like checkout
// that require an account but not a specific role.
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteLoading />;
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

// Staff-level only (kitchenStaff, cashier, delivery, support, staff,
// manager, admin, superAdmin) — used for every /admin/* page. A logged-in
// customer who wanders to /admin is sent home rather than to the admin
// login screen, since they're already authenticated, just not authorized.
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteLoading />;
  if (!user) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (!STAFF_LEVEL_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RouteLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-mehran-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
