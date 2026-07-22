/**
 * HomePage - Landing page with hero, deals, and call-to-action
 */

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Flame, Star, Clock, Truck, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import FoodImage from '../components/ui/FoodImage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function HomePage() {
  const [deals, setDeals] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);

  useDocumentTitle(null, 'Order authentic Pakistani fast food in Hyderabad — flame-grilled tikka, zinger burgers, and falooda, delivered hot to your door.');

  useEffect(() => {
    api.get('/deals')
      .then(res => setDeals(res.data.slice(0, 4)))
      .catch(() => {})
      .finally(() => setDealsLoading(false));
    api.get('/menu-items')
      .then(res => setPopularItems(res.data.filter(i => i.isPopular).slice(0, 4)))
      .catch(() => {})
      .finally(() => setItemsLoading(false));
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-mehran-surface-container-high">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-mehran-primary-container/20 via-transparent to-transparent" />
        <div className="relative px-6 py-16 md:py-24 md:px-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-mehran-primary-container/20 text-mehran-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <Flame className="w-4 h-4" /> Now Open for Delivery
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-mehran-on-surface leading-tight mb-6">
              Authentic Pakistani<br />
              <span className="text-mehran-secondary">Fast Food</span>
            </h1>
            <p className="text-mehran-on-surface-variant text-lg mb-8 max-w-lg">
              Smoky flame-grilled tikka, hand-breaded zinger burgers, and traditional falooda — 
              delivered hot to your door in Hyderabad.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/menu" className="btn-primary inline-flex items-center gap-2">
                Order Now <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/track-order" className="px-6 py-3 rounded-mehran font-semibold border border-mehran-surface-variant text-mehran-on-surface hover:bg-mehran-surface-variant/20 transition-all">
                Track Order
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Clock, title: 'Fast Delivery', desc: 'Hot food delivered in 30-45 minutes across Hyderabad.' },
          { icon: Star, title: 'Premium Quality', desc: 'Hand-breaded chicken, fresh ingredients, authentic recipes.' },
          { icon: Truck, title: 'Free Delivery', desc: 'No delivery charges on orders above Rs. 500.' },
        ].map((f, i) => (
          <div key={i} className="card-surface p-6">
            <div className="w-12 h-12 bg-mehran-primary-container/20 rounded-xl flex items-center justify-center mb-4">
              <f.icon className="w-6 h-6 text-mehran-primary" />
            </div>
            <h3 className="font-bold text-mehran-on-surface mb-2">{f.title}</h3>
            <p className="text-sm text-mehran-on-surface-variant">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Popular Deals */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-mehran-on-surface">Popular Deals</h2>
          <Link to="/menu" className="text-sm font-semibold text-mehran-secondary hover:text-mehran-primary flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {dealsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : deals.length === 0 ? (
          <EmptyState icon={Flame} title="No deals available right now" description="Check back soon for our latest combo deals." />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deals.map(deal => (
            <div key={deal._id} className="card-cream p-4 group hover:shadow-lg transition-all fade-in">
              <FoodImage
                src={deal.image}
                alt={deal.title}
                className="aspect-square rounded-xl mb-3"
                iconClassName="w-12 h-12"
              />
              <h3 className="font-bold text-mehran-on-surface text-sm mb-1 line-clamp-2">{deal.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-extrabold text-mehran-primary-container">Rs. {deal.price}</span>
                <Link to="/menu" className="text-xs font-semibold text-mehran-on-tertiary-fixed-variant hover:text-mehran-primary-container">
                  Order
                </Link>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* Popular Items */}
      <section>
        <h2 className="text-2xl font-bold text-mehran-on-surface mb-6">Customer Favorites</h2>
        {itemsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : popularItems.length === 0 ? (
          <EmptyState icon={Star} title="No favorites yet" description="Popular items will show up here once customers start ordering." />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularItems.map(item => (
            <div key={item._id} className="card-surface p-4 group fade-in">
              <FoodImage
                src={item.image}
                alt={item.name}
                className="aspect-square rounded-xl mb-3"
                iconClassName="w-10 h-10"
              />
              <h3 className="font-bold text-mehran-on-surface text-sm mb-1">{item.name}</h3>
              <p className="text-xs text-mehran-on-surface-variant line-clamp-2 mb-2">{item.description}</p>
              <span className="text-lg font-extrabold text-mehran-secondary">Rs. {item.price}</span>
            </div>
          ))}
        </div>
        )}
      </section>
    </div>
  );
}
