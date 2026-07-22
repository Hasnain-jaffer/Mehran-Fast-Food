/**
 * AdminCouponsPage - Create/edit/delete percentage-off coupon codes (admin/staff only)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ArrowLeft, Plus, Trash2, Edit3, Tag } from 'lucide-react';

export default function AdminCouponsPage() {
  useDocumentTitle('Manage Coupons', null, { noIndex: true });
  const { isAdmin } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        percentOff: parseFloat(formData.percentOff) || 0,
        maxDiscountAmount: parseFloat(formData.maxDiscountAmount) || 0,
        minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
        expiresAt: formData.expiresAt || null,
        usageLimit: parseInt(formData.usageLimit) || 0,
        perUserLimit: formData.perUserLimit === '' ? 1 : parseInt(formData.perUserLimit),
        isActive: formData.isActive !== false
      };
      if (editingItem) {
        await api.patch(`/coupons/${editingItem._id}`, payload);
      } else {
        await api.post('/coupons', { ...payload, code: formData.code });
      }
      setShowForm(false); setEditingItem(null); setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon? Past orders that used it keep their record either way.')) return;
    try {
      await api.delete(`/coupons/${id}`);
      fetchData();
    } catch (err) { alert('Failed to delete'); }
  };

  const openEdit = (coupon) => {
    setEditingItem(coupon);
    setFormData({
      code: coupon.code,
      percentOff: coupon.percentOff,
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      minOrderAmount: coupon.minOrderAmount || '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      usageLimit: coupon.usageLimit || '',
      perUserLimit: coupon.perUserLimit,
      isActive: coupon.isActive
    });
    setShowForm(true);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-mehran-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-mehran-on-surface mb-2">Access Denied</h2>
          <Link to="/login" className="btn-primary">Login as Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mehran-bg text-mehran-on-bg font-jakarta">
      <div className="bg-mehran-surface-container-high border-b border-mehran-surface-variant/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-mehran-on-surface-variant hover:text-mehran-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-mehran-on-surface">Manage Coupons</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({}); }}
            className="ml-auto px-4 py-2 bg-mehran-primary-container text-white rounded-lg text-sm font-semibold hover:brightness-110 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card-surface p-6 mb-6 space-y-4">
            <h3 className="font-bold text-mehran-on-surface">{editingItem ? 'Edit' : 'Add'} Coupon</h3>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Code (e.g. WELCOME10)" value={formData.code || ''}
                disabled={!!editingItem}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="input-field disabled:opacity-60" />
              <input type="number" placeholder="% off (1-100)" value={formData.percentOff ?? ''}
                onChange={e => setFormData({ ...formData, percentOff: e.target.value })} className="input-field" />
              <input type="number" placeholder="Max discount Rs. (0 = no cap)" value={formData.maxDiscountAmount ?? ''}
                onChange={e => setFormData({ ...formData, maxDiscountAmount: e.target.value })} className="input-field" />
              <input type="number" placeholder="Min order Rs. (0 = none)" value={formData.minOrderAmount ?? ''}
                onChange={e => setFormData({ ...formData, minOrderAmount: e.target.value })} className="input-field" />
              <input type="number" placeholder="Total uses allowed (0 = unlimited)" value={formData.usageLimit ?? ''}
                onChange={e => setFormData({ ...formData, usageLimit: e.target.value })} className="input-field" />
              <input type="number" placeholder="Uses per customer" value={formData.perUserLimit ?? ''}
                onChange={e => setFormData({ ...formData, perUserLimit: e.target.value })} className="input-field" />
              <div>
                <label className="text-xs text-mehran-on-surface-variant mb-1 block">Expires (optional)</label>
                <input type="date" value={formData.expiresAt || ''}
                  onChange={e => setFormData({ ...formData, expiresAt: e.target.value })} className="input-field" />
              </div>
              <label className="flex items-center gap-2 text-sm text-mehran-on-surface-variant self-end pb-2">
                <input type="checkbox" checked={formData.isActive !== false}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-mehran-on-surface-variant hover:text-mehran-on-surface">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {coupons.length === 0 && (
            <p className="text-mehran-on-surface-variant text-sm text-center py-8">No coupons yet — add your first one above.</p>
          )}
          {coupons.map(coupon => (
            <div key={coupon._id} className="card-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-mehran-surface-container-low flex items-center justify-center">
                  <Tag className="w-4 h-4 text-mehran-on-surface-variant" />
                </div>
                <div>
                  <p className="font-bold text-mehran-on-surface text-sm">
                    {coupon.code} — {coupon.percentOff}% off
                    {!coupon.isActive && <span className="ml-2 text-xs text-mehran-error">Inactive</span>}
                  </p>
                  <p className="text-xs text-mehran-on-surface-variant">
                    Used {coupon.usage?.length || 0}{coupon.usageLimit > 0 ? `/${coupon.usageLimit}` : ''} times
                    {coupon.minOrderAmount > 0 && ` • Min order Rs. ${coupon.minOrderAmount}`}
                    {coupon.expiresAt && ` • Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(coupon)} className="p-2 hover:bg-mehran-surface-variant/20 rounded-lg">
                  <Edit3 className="w-4 h-4 text-mehran-secondary" />
                </button>
                <button onClick={() => handleDelete(coupon._id)} className="p-2 hover:bg-mehran-error-container/20 rounded-lg">
                  <Trash2 className="w-4 h-4 text-mehran-error" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
