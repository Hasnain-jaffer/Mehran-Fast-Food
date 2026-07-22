/**
 * AdminLoginPage - Login for admin/staff and customers
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChefHat, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AdminLoginPage() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  useDocumentTitle(
    isAdminRoute ? 'Admin Login' : 'Login',
    isAdminRoute ? null : 'Log in to your Mehran Fast Food account to order and track deliveries.',
    { noIndex: isAdminRoute }
  );
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const redirectTo = new URLSearchParams(location.search).get('redirect');
  // Admin/staff accounts are created ahead of time by an existing admin
  // (see auth.controller.js createStaffAccount) — there is no public
  // self-registration for staff, so /admin/login never offers it.
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let userData;
      if (isRegister) {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        userData = await register(name, phone, password);
      } else {
        userData = await login(phone, password);
      }
      const staffLevelRoles = ['kitchenStaff', 'cashier', 'delivery', 'support', 'staff', 'manager', 'admin', 'superAdmin'];
      const isStaff = staffLevelRoles.includes(userData.role);

      // A non-staff account has no business landing on an /admin/* page
      // even if that's where `redirect` points (e.g. a stale/tampered
      // link) — only honor `redirect` when it matches what the account
      // is actually allowed to see.
      if (redirectTo && (isStaff || !redirectTo.startsWith('/admin'))) {
        navigate(redirectTo);
      } else if (isStaff) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mehran-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-mehran-on-surface-variant text-sm mb-6 hover:text-mehran-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-mehran-primary-container rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-mehran-on-primary-container" />
          </div>
          <h1 className="text-2xl font-extrabold text-mehran-on-surface">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-mehran-on-surface-variant text-sm mt-1">
            {isRegister ? 'Sign up to order delicious food' : 'Login to your Mehran account'}
          </p>
        </div>

        {error && (
          <div className="bg-mehran-error-container/20 border border-mehran-error text-mehran-error px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && !isAdminRoute && (
            <div>
              <label className="text-xs text-mehran-on-surface-variant mb-1 block">Full Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" className="input-field"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-mehran-on-surface-variant mb-1 block">Phone Number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX" className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-mehran-on-surface-variant mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters" className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mehran-on-tertiary-fixed-variant">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full btn-primary disabled:opacity-50">
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>

        {!isAdminRoute && (
          <p className="text-center text-sm text-mehran-on-surface-variant mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-mehran-secondary font-semibold hover:text-mehran-primary">
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
        )}
        {isAdminRoute && (
          <p className="text-center text-xs text-mehran-on-surface-variant mt-6">
            Staff accounts are created by an administrator — there's no self-signup here.
          </p>
        )}
      </div>
    </div>
  );
}
