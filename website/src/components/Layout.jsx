/**
 * Layout - Shared layout with Navbar and Footer
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Menu, X, User, LogOut, ChefHat } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/menu', label: 'Menu' },
    { to: '/cart', label: 'Cart' },
    { to: '/track-order', label: 'Track Order' },
  ];

  return (
    <div className="min-h-screen bg-mehran-bg text-mehran-on-bg font-jakarta">
      {/* Skip link — first focusable element on the page for keyboard/screen-reader users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-mehran-surface-container-high/95 backdrop-blur-md border-b border-mehran-surface-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-mehran-primary-container rounded-full flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-mehran-on-primary-container" />
              </div>
              <span className="text-xl font-extrabold text-mehran-primary tracking-tight">MEHRAN</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-semibold transition-colors ${
                    location.pathname === link.to
                      ? 'text-mehran-secondary'
                      : 'text-mehran-on-surface-variant hover:text-mehran-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="text-sm font-semibold text-mehran-secondary hover:text-mehran-primary transition-colors">
                  Dashboard
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                to="/cart"
                className="relative p-2 hover:bg-mehran-surface-variant/20 rounded-lg transition-colors"
                aria-label={`Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
              >
                <ShoppingCart className="w-5 h-5 text-mehran-on-surface" aria-hidden="true" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-mehran-primary-container text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
              {user ? (
                <div className="hidden md:flex items-center gap-2">
                  <User className="w-4 h-4 text-mehran-tertiary" />
                  <span className="text-sm text-mehran-on-surface-variant">{user.name}</span>
                  <button onClick={logout} className="p-1 hover:bg-mehran-surface-variant/20 rounded" aria-label="Log out">
                    <LogOut className="w-4 h-4 text-mehran-on-surface-variant" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="hidden md:block text-sm font-semibold text-mehran-secondary hover:text-mehran-primary">
                  Login
                </Link>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-mehran-surface-container-high border-t border-mehran-surface-variant/20 px-4 py-4 space-y-3">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-semibold py-2"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-mehran-secondary py-2">
                Dashboard
              </Link>
            )}
            {user ? (
              <button onClick={() => { logout(); setMenuOpen(false); }} className="flex items-center gap-2 text-sm text-mehran-error py-2">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-mehran-secondary py-2">
                Login
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-mehran-surface-variant/20 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-mehran-on-surface-variant text-sm">
            &copy; 2026 Mehran Fast Food. All rights reserved.
          </p>
          <p className="text-mehran-on-tertiary-fixed-variant text-xs mt-2">
            Authentic Pakistani flavors, delivered to your door.
          </p>
        </div>
      </footer>
    </div>
  );
}
