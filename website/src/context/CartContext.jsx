/**
 * CartContext - Global cart state for the website
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

// Two cart lines are "the same" only if they're the same item AND the same
// customization (variant + add-ons) — a Large Zinger Burger and a Regular
// one need to stay separate lines, not merge quantities together.
export function getLineKey(item) {
  const addOnsSig = (item.addOns || []).map(a => a.name).slice().sort().join('|');
  return [item._id, item.refType, item.variantName || '', addOnsSig].join('::');
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { const saved = localStorage.getItem('mehran_cart'); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem('mehran_cart', JSON.stringify(items)); }, [items]);

  const addItem = (item) => {
    const key = getLineKey(item);
    setItems(prev => {
      const existing = prev.find(i => getLineKey(i) === key);
      if (existing) {
        return prev.map(i => getLineKey(i) === key ? { ...i, qty: i.qty + (item.qty || 1) } : i);
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => getLineKey(i) !== key));

  const updateQty = (key, qty) => {
    if (qty <= 0) { removeItem(key); return; }
    setItems(prev => prev.map(i => getLineKey(i) === key ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalAmount, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() { return useContext(CartContext); }
