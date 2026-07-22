/**
 * Thin wrappers around the Phase 3 user-management endpoints.
 * Uses the shared `api` axios instance (utils/api.js), which already
 * attaches the access token and handles silent refresh on 401.
 *
 * No UI was built against these yet — they're provided so a profile page,
 * address book, or wishlist UI can be wired up without also having to
 * hand-write the request plumbing.
 */
import api from './api';

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (name) => api.patch('/users/me', { name }),
  changePassword: (currentPassword, newPassword) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),
  deactivateAccount: () => api.post('/users/me/deactivate'),

  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/users/me/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  forgotPassword: (phone) => api.post('/users/forgot-password', { phone }),
  resetPassword: (phone, token, newPassword) =>
    api.post('/users/reset-password', { phone, token, newPassword }),

  listAddresses: () => api.get('/users/me/addresses'),
  addAddress: (address) => api.post('/users/me/addresses', address),
  updateAddress: (addressId, address) => api.put(`/users/me/addresses/${addressId}`, address),
  deleteAddress: (addressId) => api.delete(`/users/me/addresses/${addressId}`),

  listFavorites: () => api.get('/users/me/favorites'),
  addFavorite: (refType, refId) => api.post('/users/me/favorites', { refType, refId }),
  removeFavorite: (refType, refId) => api.delete('/users/me/favorites', { data: { refType, refId } })
};

export default userApi;
