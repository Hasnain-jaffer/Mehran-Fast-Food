/**
 * Reusable empty-state block — e.g. "no items in this category", "no
 * orders yet". Consistent look everywhere instead of each page inventing
 * its own ad-hoc "nothing here" message.
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4" role="status">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-mehran-surface-variant/20 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-mehran-on-surface-variant" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-bold text-mehran-on-surface text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-mehran-on-surface-variant max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
