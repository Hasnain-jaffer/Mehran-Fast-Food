/**
 * FoodImage — renders a menu item/deal's actual photo when one exists,
 * lazy-loaded, with a graceful icon fallback when it doesn't (or fails to
 * load). Previously every card across the site ignored the `image` field
 * entirely and always showed a generic placeholder icon, even for items
 * that had a real uploaded photo — this fixes that.
 */
import { useState } from 'react';
import { Utensils } from 'lucide-react';

export default function FoodImage({ src, alt, className = '', iconClassName = 'w-10 h-10' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-mehran-bg ${className}`}>
        <Utensils className={`text-mehran-surface-variant ${iconClassName}`} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-mehran-bg ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
