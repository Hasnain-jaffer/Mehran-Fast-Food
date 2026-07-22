/**
 * AdminDashboard - Stats, charts, and quick actions for admin/staff
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  ShoppingBag, TrendingUp, Clock, Truck, Package,
  ChevronRight, BarChart3, Users, Tag
} from 'lucide-react';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard', null, { noIndex: true });
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/admin/stats')
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-mehran-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-mehran-on-surface mb-2">Access Denied</h2>
          <p className="text-mehran-on-surface-variant mb-4">Admin access required.</p>
          <Link to="/admin/login" className="btn-primary">Login as Admin</Link>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Today's Orders", value: stats.todayOrderCount, icon: ShoppingBag, color: 'bg-mehran-primary-container' },
    { label: "Today's Revenue", value: `Rs. ${stats.todayRevenue}`, icon: TrendingUp, color: 'bg-mehran-secondary' },
    { label: 'Pending Orders', value: stats.pendingCount, icon: Clock, color: 'bg-mehran-tertiary-container' },
    { label: 'Active Deliveries', value: stats.activeDeliveryCount, icon: Truck, color: 'bg-mehran-inverse-primary' },
  ] : [];

  return (
    <div className="min-h-screen bg-mehran-bg text-mehran-on-bg font-jakarta">
      {/* Admin Header */}
      <div className="bg-mehran-surface-container-high border-b border-mehran-surface-variant/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mehran-primary-container rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-mehran-on-primary-container" />
            </div>
            <div>
              <h1 className="font-bold text-mehran-on-surface">Admin Dashboard</h1>
              <p className="text-xs text-mehran-on-surface-variant">Welcome back, {user?.name}</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-mehran-on-surface-variant hover:text-mehran-primary">
            Back to Site
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-mehran-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, i) => (
                <div key={i} className="card-surface p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-mehran-on-surface">{card.value}</p>
                  <p className="text-sm text-mehran-on-surface-variant">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to="/admin/orders" className="card-surface p-5 hover:bg-mehran-surface-variant/10 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-mehran-secondary/20 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-mehran-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-mehran-on-surface">Manage Orders</h3>
                      <p className="text-xs text-mehran-on-surface-variant">View and update order statuses</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-mehran-on-surface-variant group-hover:text-mehran-secondary transition-colors" />
                </div>
              </Link>
              <Link to="/admin/menu" className="card-surface p-5 hover:bg-mehran-surface-variant/10 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-mehran-primary/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-mehran-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-mehran-on-surface">Manage Menu</h3>
                      <p className="text-xs text-mehran-on-surface-variant">Add or edit deals and items</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-mehran-on-surface-variant group-hover:text-mehran-secondary transition-colors" />
                </div>
              </Link>
              <Link to="/admin/categories" className="card-surface p-5 hover:bg-mehran-surface-variant/10 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-mehran-tertiary/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-mehran-tertiary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-mehran-on-surface">Manage Categories</h3>
                      <p className="text-xs text-mehran-on-surface-variant">Add or edit menu categories</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-mehran-on-surface-variant group-hover:text-mehran-secondary transition-colors" />
                </div>
              </Link>
              <Link to="/admin/coupons" className="card-surface p-5 hover:bg-mehran-surface-variant/10 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-mehran-secondary/20 rounded-lg flex items-center justify-center">
                      <Tag className="w-5 h-5 text-mehran-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-mehran-on-surface">Manage Coupons</h3>
                      <p className="text-xs text-mehran-on-surface-variant">Create and track discount codes</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-mehran-on-surface-variant group-hover:text-mehran-secondary transition-colors" />
                </div>
              </Link>
            </div>

            {/* Top Deals */}
            {stats?.topDeals?.length > 0 && (
              <div className="card-surface p-6">
                <h3 className="font-bold text-mehran-on-surface mb-4">Top Selling Deals</h3>
                <div className="space-y-3">
                  {stats.topDeals.map((deal, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-mehran-surface-variant/20 text-mehran-on-surface-variant text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-mehran-on-surface">{deal.name}</span>
                      </div>
                      <span className="text-sm font-bold text-mehran-secondary">{deal.count} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
