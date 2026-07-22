/**
 * Constants for the website
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const STATUS_LABELS = {
  placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};
export const STATUS_COLORS = {
  placed: 'bg-mehran-on-surface-variant', confirmed: 'bg-mehran-tertiary',
  preparing: 'bg-mehran-secondary', out_for_delivery: 'bg-mehran-primary-container',
  delivered: 'bg-green-500', cancelled: 'bg-mehran-error-container'
};
