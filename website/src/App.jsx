/**
 * App.jsx - Main Router
 * Public pages: Home, Menu, Cart, Order Tracking
 * Admin pages: Login, Dashboard, Orders, Menu Management
 */

import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAuth, RequireAdmin } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import TrackOrderPage from './pages/TrackOrderPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminMenuPage from './pages/AdminMenuPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminCouponsPage from './pages/AdminCouponsPage';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="track-order" element={<TrackOrderPage />} />
        <Route path="login" element={<AdminLoginPage />} />
      </Route>
      {/* Admin Routes — login is public, everything else requires a
          logged-in staff-level account (see RequireAdmin) */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/admin/orders" element={<RequireAdmin><AdminOrdersPage /></RequireAdmin>} />
      <Route path="/admin/menu" element={<RequireAdmin><AdminMenuPage /></RequireAdmin>} />
      <Route path="/admin/categories" element={<RequireAdmin><AdminCategoriesPage /></RequireAdmin>} />
      <Route path="/admin/coupons" element={<RequireAdmin><AdminCouponsPage /></RequireAdmin>} />
    </Routes>
  );
}

export default App;
