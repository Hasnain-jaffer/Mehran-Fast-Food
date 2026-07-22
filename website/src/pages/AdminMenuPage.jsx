/**
 * AdminMenuPage - Add/edit deals and menu items
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ArrowLeft, Plus, Trash2, Edit3, Utensils, Tag } from 'lucide-react';

export default function AdminMenuPage() {
  useDocumentTitle('Manage Menu', null, { noIndex: true });
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('deals');
  const [deals, setDeals] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    try {
      const [dRes, mRes, cRes] = await Promise.all([
        api.get('/deals'), api.get('/menu-items'), api.get('/categories')
      ]);
      setDeals(dRes.data); setMenuItems(mRes.data); setCategories(cRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'deals') {
        const payload = {
          dealNumber: parseInt(formData.dealNumber) || 1,
          title: formData.title,
          items: formData.items?.split(',').map(s => s.trim()).filter(Boolean) || [],
          price: parseFloat(formData.price) || 0,
          image: formData.image || '',
          isAvailable: formData.isAvailable !== false,
          isPopular: formData.isPopular === true,
          sortOrder: parseInt(formData.sortOrder) || 0
        };
        if (editingItem) {
          await api.put(`/deals/${editingItem._id}`, payload);
        } else {
          await api.post('/deals', payload);
        }
      } else {
        const payload = {
          name: formData.name,
          description: formData.description || '',
          price: parseFloat(formData.price) || 0,
          image: formData.image || '',
          category: formData.category,
          isAvailable: formData.isAvailable !== false,
          isPopular: formData.isPopular === true,
          variants: (formData.variants || []).filter(v => v.name?.trim()).map(v => ({
            name: v.name.trim(), priceDelta: parseFloat(v.priceDelta) || 0, isDefault: !!v.isDefault
          })),
          addOns: (formData.addOns || []).filter(a => a.name?.trim()).map(a => ({
            name: a.name.trim(), price: parseFloat(a.price) || 0, isAvailable: a.isAvailable !== false
          }))
        };
        if (editingItem) {
          await api.put(`/menu-items/${editingItem._id}`, payload);
        } else {
          await api.post('/menu-items', payload);
        }
      }
      setShowForm(false); setEditingItem(null); setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (activeTab === 'deals') await api.delete(`/deals/${id}`);
      else await api.delete(`/menu-items/${id}`);
      fetchData();
    } catch (err) { alert('Failed to delete'); }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'deals') {
      setFormData({
        dealNumber: item.dealNumber,
        title: item.title,
        items: item.items?.join(', '),
        price: item.price,
        image: item.image || '',
        isAvailable: item.isAvailable,
        isPopular: item.isPopular,
        sortOrder: item.sortOrder
      });
    } else {
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image || '',
        category: typeof item.category === 'object' ? item.category._id : item.category,
        isAvailable: item.isAvailable,
        isPopular: item.isPopular,
        variants: item.variants || [],
        addOns: item.addOns || []
      });
    }
    setShowForm(true);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-mehran-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-mehran-on-surface mb-2">Access Denied</h2>
          <Link to="/admin/login" className="btn-primary">Login as Admin</Link>
        </div>
      </div>
    );
  }

  const items = activeTab === 'deals' ? deals : menuItems;

  return (
    <div className="min-h-screen bg-mehran-bg text-mehran-on-bg font-jakarta">
      <div className="bg-mehran-surface-container-high border-b border-mehran-surface-variant/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-mehran-on-surface-variant hover:text-mehran-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-mehran-on-surface">Manage Menu</h1>
          <Link to="/admin/categories" className="ml-auto text-sm font-semibold text-mehran-secondary hover:text-mehran-primary">
            Manage Categories →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => { setActiveTab('deals'); setShowForm(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === 'deals' ? 'bg-mehran-secondary text-mehran-on-secondary' : 'bg-mehran-surface-container text-mehran-on-surface-variant'}`}>
            <Tag className="w-4 h-4 inline mr-1" /> Deals
          </button>
          <button onClick={() => { setActiveTab('items'); setShowForm(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === 'items' ? 'bg-mehran-secondary text-mehran-on-secondary' : 'bg-mehran-surface-container text-mehran-on-surface-variant'}`}>
            <Utensils className="w-4 h-4 inline mr-1" /> Menu Items
          </button>
          <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({}); }}
            className="ml-auto px-4 py-2 bg-mehran-primary-container text-white rounded-lg text-sm font-semibold hover:brightness-110 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add {activeTab === 'deals' ? 'Deal' : 'Item'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card-surface p-6 mb-6 space-y-4">
            <h3 className="font-bold text-mehran-on-surface">
              {editingItem ? 'Edit' : 'Add'} {activeTab === 'deals' ? 'Deal' : 'Menu Item'}
            </h3>
            {activeTab === 'deals' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Deal Number" value={formData.dealNumber || ''}
                    onChange={e => setFormData({...formData, dealNumber: e.target.value})} className="input-field" />
                  <input type="text" placeholder="Title" value={formData.title || ''}
                    onChange={e => setFormData({...formData, title: e.target.value})} className="input-field" />
                </div>
                <input type="text" placeholder="Items (comma separated)" value={formData.items || ''}
                  onChange={e => setFormData({...formData, items: e.target.value})} className="input-field" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Price" value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: e.target.value})} className="input-field" />
                  <input type="number" placeholder="Sort Order" value={formData.sortOrder || ''}
                    onChange={e => setFormData({...formData, sortOrder: e.target.value})} className="input-field" />
                </div>
                <div>
                  <input type="text" placeholder="Image URL (paste a link to a photo)" value={formData.image || ''}
                    onChange={e => setFormData({...formData, image: e.target.value})} className="input-field" />
                  <p className="text-xs text-mehran-on-surface-variant mt-1">
                    Paste any public image URL for now (e.g. from a free image host). Direct photo upload from this
                    form needs Cloudinary keys added to the backend .env — ask your developer to enable that next.
                  </p>
                  {formData.image && (
                    <img src={formData.image} alt="preview" className="w-20 h-20 object-cover rounded-lg mt-2 border border-mehran-surface-variant/30"
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                </div>
              </>
            ) : (
              <>
                <input type="text" placeholder="Name" value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" />
                <input type="text" placeholder="Description" value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Price" value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: e.target.value})} className="input-field" />
                  <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="input-field">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <input type="text" placeholder="Image URL (paste a link to a photo)" value={formData.image || ''}
                    onChange={e => setFormData({...formData, image: e.target.value})} className="input-field" />
                  {formData.image && (
                    <img src={formData.image} alt="preview" className="w-20 h-20 object-cover rounded-lg mt-2 border border-mehran-surface-variant/30"
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                </div>

                {/* Variants (e.g. Small/Large sizes) */}
                <div className="border border-mehran-surface-variant/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-mehran-on-surface">Variants (optional sizes/types)</p>
                  {(formData.variants || []).map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" placeholder="Name (e.g. Large)" value={v.name || ''}
                        onChange={e => {
                          const variants = [...formData.variants];
                          variants[idx] = { ...variants[idx], name: e.target.value };
                          setFormData({ ...formData, variants });
                        }} className="input-field flex-1" />
                      <input type="number" placeholder="+Rs." value={v.priceDelta ?? ''}
                        onChange={e => {
                          const variants = [...formData.variants];
                          variants[idx] = { ...variants[idx], priceDelta: e.target.value };
                          setFormData({ ...formData, variants });
                        }} className="input-field w-24" />
                      <label className="flex items-center gap-1 text-xs text-mehran-on-surface-variant whitespace-nowrap">
                        <input type="checkbox" checked={!!v.isDefault}
                          onChange={e => {
                            const variants = formData.variants.map((vv, i) => ({ ...vv, isDefault: i === idx ? e.target.checked : false }));
                            setFormData({ ...formData, variants });
                          }} />
                        Default
                      </label>
                      <button type="button" onClick={() => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== idx) })}
                        className="p-1 text-mehran-error hover:bg-mehran-error-container/20 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setFormData({ ...formData, variants: [...(formData.variants || []), { name: '', priceDelta: 0, isDefault: false }] })}
                    className="text-xs font-semibold text-mehran-secondary hover:text-mehran-primary flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>

                {/* Add-ons (extras) */}
                <div className="border border-mehran-surface-variant/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-mehran-on-surface">Add-ons (optional extras)</p>
                  {(formData.addOns || []).map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" placeholder="Name (e.g. Extra Cheese)" value={a.name || ''}
                        onChange={e => {
                          const addOns = [...formData.addOns];
                          addOns[idx] = { ...addOns[idx], name: e.target.value };
                          setFormData({ ...formData, addOns });
                        }} className="input-field flex-1" />
                      <input type="number" placeholder="Rs." value={a.price ?? ''}
                        onChange={e => {
                          const addOns = [...formData.addOns];
                          addOns[idx] = { ...addOns[idx], price: e.target.value };
                          setFormData({ ...formData, addOns });
                        }} className="input-field w-24" />
                      <label className="flex items-center gap-1 text-xs text-mehran-on-surface-variant whitespace-nowrap">
                        <input type="checkbox" checked={a.isAvailable !== false}
                          onChange={e => {
                            const addOns = [...formData.addOns];
                            addOns[idx] = { ...addOns[idx], isAvailable: e.target.checked };
                            setFormData({ ...formData, addOns });
                          }} />
                        Available
                      </label>
                      <button type="button" onClick={() => setFormData({ ...formData, addOns: formData.addOns.filter((_, i) => i !== idx) })}
                        className="p-1 text-mehran-error hover:bg-mehran-error-container/20 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setFormData({ ...formData, addOns: [...(formData.addOns || []), { name: '', price: 0, isAvailable: true }] })}
                    className="text-xs font-semibold text-mehran-secondary hover:text-mehran-primary flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Add-on
                  </button>
                </div>
              </>
            )}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-mehran-on-surface-variant">
                <input type="checkbox" checked={formData.isAvailable !== false}
                  onChange={e => setFormData({...formData, isAvailable: e.target.checked})} className="rounded" />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm text-mehran-on-surface-variant">
                <input type="checkbox" checked={formData.isPopular === true}
                  onChange={e => setFormData({...formData, isPopular: e.target.checked})} className="rounded" />
                Popular
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-mehran-on-surface-variant hover:text-mehran-on-surface">Cancel</button>
            </div>
          </form>
        )}

        {/* Items List */}
        <div className="space-y-2">
          {items.map(item => (
            <div key={item._id} className="card-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.image ? (
                  <img src={item.image} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-mehran-surface-container-low flex-shrink-0" />
                )}
                <div>
                  <p className="font-bold text-mehran-on-surface text-sm">
                    {activeTab === 'deals' ? `Deal #${item.dealNumber}: ${item.title}` : item.name}
                  </p>
                  <p className="text-xs text-mehran-on-surface-variant">
                    Rs. {item.price} {item.isPopular && '• Popular'} {item.isAvailable ? '• Available' : '• Unavailable'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(item)} className="p-2 hover:bg-mehran-surface-variant/20 rounded-lg">
                  <Edit3 className="w-4 h-4 text-mehran-secondary" />
                </button>
                <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-mehran-error-container/20 rounded-lg">
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
