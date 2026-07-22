/**
 * User Routes (mounted at /api/users)
 *
 * Self-service (any authenticated user):
 *   GET    /me                    - own profile
 *   PATCH  /me                    - update own profile (name only)
 *   PATCH  /me/password           - change own password (requires current password)
 *   POST   /me/deactivate         - deactivate own account
 *   POST   /me/profile-image      - upload/replace own profile photo
 *   GET    /me/addresses          - list own addresses
 *   POST   /me/addresses          - add an address
 *   PUT    /me/addresses/:addressId    - update an address
 *   DELETE /me/addresses/:addressId    - delete an address
 *   GET    /me/favorites          - list own favorites/wishlist
 *   POST   /me/favorites          - add a favorite
 *   DELETE /me/favorites          - remove a favorite
 *
 * Public (no auth — forgot-password flow):
 *   POST   /forgot-password
 *   POST   /reset-password
 *
 * Admin-only:
 *   PATCH  /:id/active            - enable/disable another user's account
 *   DELETE /:id                   - soft-delete another user's account
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiters');
const { ADMIN_LEVEL } = require('../constants/roles');
const {
  updateProfileValidators,
  changePasswordValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  addressValidators,
  updateAddressValidators,
  addressIdParamValidator,
  favoriteValidators,
  setActiveValidators
} = require('../validators/user.validators');

// --- Public: forgot/reset password ---
router.post('/forgot-password', authLimiter, forgotPasswordValidators, validate, userController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidators, validate, userController.resetPassword);

// --- Self-service ---
router.get('/me', authenticate, userController.getMyProfile);
router.patch('/me', authenticate, updateProfileValidators, validate, userController.updateMyProfile);
router.patch('/me/password', authenticate, changePasswordValidators, validate, userController.changePassword);
router.post('/me/deactivate', authenticate, userController.deactivateMyAccount);
router.post('/me/profile-image', authenticate, upload.single('image'), userController.uploadProfileImage);

router.get('/me/addresses', authenticate, userController.listAddresses);
router.post('/me/addresses', authenticate, addressValidators, validate, userController.addAddress);
router.put(
  '/me/addresses/:addressId',
  authenticate,
  addressIdParamValidator,
  updateAddressValidators,
  validate,
  userController.updateAddress
);
router.delete(
  '/me/addresses/:addressId',
  authenticate,
  addressIdParamValidator,
  validate,
  userController.deleteAddress
);

router.get('/me/favorites', authenticate, userController.listFavorites);
router.post('/me/favorites', authenticate, favoriteValidators, validate, userController.addFavorite);
router.delete('/me/favorites', authenticate, favoriteValidators, validate, userController.removeFavorite);

// --- Admin-only ---
router.patch(
  '/:id/active',
  authenticate,
  authorize(...ADMIN_LEVEL),
  setActiveValidators,
  validate,
  userController.setUserActive
);
router.delete('/:id', authenticate, authorize(...ADMIN_LEVEL), userController.softDeleteUser);

module.exports = router;
