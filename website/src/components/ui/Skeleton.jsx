/**
 * Skeleton loading placeholders.
 * Used while a page's initial data fetch is in flight, so the layout
 * doesn't flash from blank -> content with no visual continuity, and so
 * a slow network doesn't look like a broken/frozen page.
 */

function Bone({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-mehran-surface-variant/30 ${className}`} />;
}

// Mirrors the shape of a menu-item/deal card (image + title + price row)
// so the transition from skeleton -> real content doesn't jump around.
export function CardSkeleton() {
  return (
    <div className="card-cream p-4 flex flex-col" aria-hidden="true">
      <Bone className="aspect-video mb-3" />
      <Bone className="h-5 w-3/4 mb-2" />
      <Bone className="h-3 w-full mb-1" />
      <Bone className="h-3 w-2/3 mb-3" />
      <div className="mt-auto flex items-center justify-between">
        <Bone className="h-6 w-16" />
        <Bone className="h-8 w-20" />
      </div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="status"
      aria-label="Loading menu items"
    >
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export default Bone;
