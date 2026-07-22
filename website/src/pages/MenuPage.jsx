/**
 * MenuPage - Browse deals and menu items, add to cart
 */

import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import api from '../utils/api';
import { Plus, Minus, ShoppingCart, Utensils, Tag, Star } from 'lucide-react';
import { CardSkeletonGrid } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import FoodImage from '../components/ui/FoodImage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('deals');
  const [quantities, setQuantities] = useState({});
  const [selections, setSelections] = useState({}); // itemId -> { variantName, addOns: [names] }
  const [ratings, setRatings] = useState({}); // refId -> { avgRating, count }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addItem } = useCart();

  useDocumentTitle('Menu', 'Browse our full menu of deals, burgers, tikka, and more — order online for delivery in Hyderabad.');

  const loadMenu = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/categories'),
      api.get('/deals'),
      api.get('/menu-items')
    ]).then(([catRes, dealRes, itemRes]) => {
      setCategories(catRes.data);
      setDeals(dealRes.data);
      setMenuItems(itemRes.data);
    }).catch(() => {
      setError('Could not load the menu right now.');
    }).finally(() => setLoading(false));

    // Ratings are a nice-to-have overlay — fetched separately so a
    // ratings-service hiccup never blocks the actual menu from loading.
    Promise.all([
      api.get('/reviews/summary-bulk?refType=deal'),
      api.get('/reviews/summary-bulk?refType=menuItem')
    ]).then(([dealRes, itemRes]) => {
      setRatings({ ...dealRes.data, ...itemRes.data });
    }).catch(() => {});
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const getSelection = (item) => selections[item._id] || {
    variantName: item.variants?.find(v => v.isDefault)?.name || item.variants?.[0]?.name || null,
    addOns: []
  };

  const setVariantSelection = (item, variantName) => {
    setSelections(prev => ({ ...prev, [item._id]: { ...getSelection(item), variantName } }));
  };

  const toggleAddOnSelection = (item, addOnName) => {
    setSelections(prev => {
      const current = getSelection(item);
      const has = current.addOns.includes(addOnName);
      const addOns = has ? current.addOns.filter(n => n !== addOnName) : [...current.addOns, addOnName];
      return { ...prev, [item._id]: { ...current, addOns } };
    });
  };

  const computeUnitPrice = (item, sel) => {
    const variant = item.variants?.find(v => v.name === sel.variantName);
    const addOnsTotal = (sel.addOns || []).reduce((sum, name) => {
      const addOn = item.addOns?.find(a => a.name === name);
      return sum + (addOn ? addOn.price : 0);
    }, 0);
    return item.price + (variant?.priceDelta || 0) + addOnsTotal;
  };

  const handleAdd = (item, refType) => {
    const qty = quantities[item._id] || 1;
    const sel = refType === 'menuItem' ? getSelection(item) : { variantName: null, addOns: [] };
    const unitPrice = refType === 'menuItem' ? computeUnitPrice(item, sel) : item.price;
    const addOnsSnapshot = (sel.addOns || []).map(name => {
      const addOn = item.addOns?.find(a => a.name === name);
      return { name, price: addOn ? addOn.price : 0 };
    });
    addItem({
      _id: item._id,
      name: item.name || item.title,
      price: unitPrice,
      image: item.image,
      refType,
      variantName: refType === 'menuItem' ? (sel.variantName || null) : null,
      addOns: addOnsSnapshot,
      qty
    });
    setQuantities(prev => ({ ...prev, [item._id]: 1 }));
  };

  const filteredItems = activeCategory === 'deals'
    ? deals
    : menuItems.filter(i => i.category?._id === activeCategory || i.category === activeCategory);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-mehran-on-surface">Our Menu</h1>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('deals')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
            activeCategory === 'deals'
              ? 'bg-mehran-secondary text-mehran-on-secondary'
              : 'bg-mehran-surface-container text-mehran-on-surface-variant hover:bg-mehran-surface-variant/20'
          }`}
        >
          <Tag className="w-4 h-4 inline mr-1" /> Deals
        </button>
        {categories.map(cat => (
          <button
            key={cat._id}
            onClick={() => setActiveCategory(cat._id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat._id
                ? 'bg-mehran-secondary text-mehran-on-secondary'
                : 'bg-mehran-surface-container text-mehran-on-surface-variant hover:bg-mehran-surface-variant/20'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadMenu} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="Nothing here yet"
          description={activeCategory === 'deals' ? 'No deals are available right now — check back soon.' : 'No items in this category yet.'}
        />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item._id} className="card-cream p-4 flex flex-col fade-in">
            <FoodImage
              src={item.image}
              alt={item.name || item.title}
              className="aspect-video rounded-xl mb-3"
              iconClassName="w-10 h-10"
            />
            <h3 className="font-bold text-mehran-on-surface text-lg mb-1">{item.name || item.title}</h3>
            {ratings[item._id] && (
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 fill-mehran-secondary text-mehran-secondary" />
                <span className="text-xs font-semibold text-mehran-on-surface">{ratings[item._id].avgRating}</span>
                <span className="text-xs text-mehran-on-tertiary-fixed-variant">({ratings[item._id].count})</span>
              </div>
            )}
            {item.items && (
              <ul className="text-xs text-mehran-on-tertiary-fixed-variant space-y-0.5 mb-2">
                {item.items.map((it, idx) => <li key={idx}>• {it}</li>)}
              </ul>
            )}
            {item.description && (
              <p className="text-xs text-mehran-on-tertiary-fixed-variant mb-2">{item.description}</p>
            )}

            {activeCategory !== 'deals' && item.variants?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.variants.map(v => {
                  const sel = getSelection(item);
                  const active = sel.variantName === v.name;
                  return (
                    <button
                      key={v._id || v.name}
                      type="button"
                      onClick={() => setVariantSelection(item, v.name)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-mehran-secondary text-mehran-on-secondary border-mehran-secondary'
                          : 'border-mehran-surface-variant/30 text-mehran-on-surface-variant hover:border-mehran-secondary'
                      }`}
                    >
                      {v.name}{v.priceDelta ? ` (+Rs.${v.priceDelta})` : ''}
                    </button>
                  );
                })}
              </div>
            )}

            {activeCategory !== 'deals' && item.addOns?.filter(a => a.isAvailable !== false).length > 0 && (
              <div className="space-y-1 mb-2">
                {item.addOns.filter(a => a.isAvailable !== false).map(a => {
                  const sel = getSelection(item);
                  const checked = sel.addOns.includes(a.name);
                  return (
                    <label key={a._id || a.name} className="flex items-center gap-2 text-xs text-mehran-on-tertiary-fixed-variant">
                      <input type="checkbox" checked={checked} onChange={() => toggleAddOnSelection(item, a.name)} className="rounded" />
                      {a.name} (+Rs. {a.price})
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-auto pt-3 flex items-center justify-between">
              <span className="text-xl font-extrabold text-mehran-primary-container">
                Rs. {activeCategory === 'deals' ? item.price : computeUnitPrice(item, getSelection(item))}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-mehran-bg rounded-lg">
                  <button
                    onClick={() => setQuantities(prev => ({ ...prev, [item._id]: Math.max(1, (prev[item._id] || 1) - 1) }))}
                    className="px-2 py-1 text-mehran-on-surface"
                    aria-label={`Decrease quantity of ${item.name || item.title}`}
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="px-2 text-sm font-bold text-mehran-on-surface" aria-label={`Quantity: ${quantities[item._id] || 1}`}>{quantities[item._id] || 1}</span>
                  <button
                    onClick={() => setQuantities(prev => ({ ...prev, [item._id]: (prev[item._id] || 1) + 1 }))}
                    className="px-2 py-1 text-mehran-on-surface"
                    aria-label={`Increase quantity of ${item.name || item.title}`}
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <button
                  onClick={() => handleAdd(item, activeCategory === 'deals' ? 'deal' : 'menuItem')}
                  className="bg-mehran-primary-container text-white p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all"
                  aria-label={`Add ${item.name || item.title} to cart`}
                >
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
