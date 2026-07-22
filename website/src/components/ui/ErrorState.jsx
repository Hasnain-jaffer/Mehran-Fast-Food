/**
 * Reusable error-state block for a failed data fetch — distinct from
 * EmptyState (which means "the request succeeded, there's just nothing
 * to show"). Always offers a retry action since most fetch failures here
 * are transient (network blip, server restart).
 */
import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4" role="alert">
      <div className="w-16 h-16 rounded-full bg-mehran-error-container/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-mehran-error" aria-hidden="true" />
      </div>
      <h3 className="font-bold text-mehran-on-surface text-lg mb-1">Couldn't load this</h3>
      <p className="text-sm text-mehran-on-surface-variant max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost">
          Try again
        </button>
      )}
    </div>
  );
}
