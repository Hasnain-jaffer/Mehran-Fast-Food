/**
 * AdminCategoriesPage - Add/edit/delete menu categories (admin/staff only)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ArrowLeft, Plus, Trash2, Edit3, Tag } from 'lucide-react';

export default function AdminCategoriesPage() {
  useDocumentTitle('Manage Categories', null, { noIndex: true });
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        image: formData.image || '',
        sortOrder: parseInt(formData.sortOrder) || 0
      };
      if (editingItem) {
        await api.put(`/categories/${editingItem._id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setShowForm(false); setEditingItem(null); setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Menu items using it will keep the old reference until reassigned.')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch (err) { alert('Failed to delete'); }
  };

  const openEdit = (cat) => {
    setEditingItem(cat);
    setFormData({ name: cat.name, image: cat.image || '', sortOrder: cat.sortOrder });
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
          <h1 className="font-bold text-mehran-on-surface">Manage Categories</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({}); }}
            className="ml-auto px-4 py-2 bg-mehran-primary-container text-white rounded-lg text-sm font-semibold hover:brightness-110 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card-surface p-6 mb-6 space-y-4">
            <h3 className="font-bold text-mehran-on-surface">
              {editingItem ? 'Edit' : 'Add'} Category
            </h3>
            <input type="text" placeholder="Category name (e.g. Burgers, Rolls, Falooda)" value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" />
            <input type="number" placeholder="Sort Order" value={formData.sortOrder || ''}
              onChange={e => setFormData({...formData, sortOrder: e.target.value})} className="input-field" />
            <div>
              <input type="text" placeholder="Image URL (optional)" value={formData.image || ''}
                onChange={e => setFormData({...formData, image: e.target.value})} className="input-field" />
              {formData.image && (
                <img src={formData.image} alt="preview" className="w-16 h-16 object-cover rounded-lg mt-2 border border-mehran-surface-variant/30"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-mehran-on-surface-variant hover:text-mehran-on-surface">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-mehran-on-surface-variant text-sm text-center py-8">No categories yet — add your first one above.</p>
          )}
          {categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(cat => (
            <div key={cat._id} className="card-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {cat.image ? (
                  <img src={cat.image} alt="" className="w-10 h-10 object-cover rounded-lg" onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-mehran-surface-container-low flex items-center justify-center">
                    <Tag className="w-4 h-4 text-mehran-on-surface-variant" />
                  </div>
                )}
                <p className="font-bold text-mehran-on-surface text-sm">{cat.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(cat)} className="p-2 hover:bg-mehran-surface-variant/20 rounded-lg">
                  <Edit3 className="w-4 h-4 text-mehran-secondary" />
                </button>
                <button onClick={() => handleDelete(cat._id)} className="p-2 hover:bg-mehran-error-container/20 rounded-lg">
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
