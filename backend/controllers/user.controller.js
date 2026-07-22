const userService = require('../services/user.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/ApiError');

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  sendSuccess(res, 200, { user });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const user = await userService.updateProfile({ userId: req.user._id, name });
  sendSuccess(res, 200, { message: 'Profile updated', user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await userService.changePassword({ userId: req.user._id, currentPassword, newPassword });
  sendSuccess(res, 200, { message: 'Password changed. Please log in again on other devices.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await userService.requestPasswordReset({ phone });
  sendSuccess(res, 200, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { phone, token, newPassword } = req.body;
  await userService.resetPassword({ phone, token, newPassword });
  sendSuccess(res, 200, { message: 'Password reset successfully. Please log in.' });
});

// --- Addresses ---

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await userService.listAddresses(req.user._id);
  sendSuccess(res, 200, { addresses });
});

const addAddress = asyncHandler(async (req, res) => {
  const { street, landmark, city, isDefault } = req.body;
  const addresses = await userService.addAddress({ userId: req.user._id, street, landmark, city, isDefault });
  sendSuccess(res, 201, { message: 'Address added', addresses });
});

const updateAddress = asyncHandler(async (req, res) => {
  const { street, landmark, city, isDefault } = req.body;
  const addresses = await userService.updateAddress({
    userId: req.user._id,
    addressId: req.params.addressId,
    street, landmark, city, isDefault
  });
  sendSuccess(res, 200, { message: 'Address updated', addresses });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const addresses = await userService.deleteAddress({ userId: req.user._id, addressId: req.params.addressId });
  sendSuccess(res, 200, { message: 'Address deleted', addresses });
});

// --- Favorites / Wishlist ---

const listFavorites = asyncHandler(async (req, res) => {
  const favorites = await userService.listFavorites(req.user._id);
  sendSuccess(res, 200, { favorites });
});

const addFavorite = asyncHandler(async (req, res) => {
  const { refType, refId } = req.body;
  const favorites = await userService.addFavorite({ userId: req.user._id, refType, refId });
  sendSuccess(res, 201, { message: 'Added to favorites', favorites });
});

const removeFavorite = asyncHandler(async (req, res) => {
  const { refType, refId } = req.body;
  const favorites = await userService.removeFavorite({ userId: req.user._id, refType, refId });
  sendSuccess(res, 200, { message: 'Removed from favorites', favorites });
});

// --- Profile image ---

const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file provided');
  const user = await userService.updateProfileImage({ userId: req.user._id, fileBuffer: req.file.buffer });
  sendSuccess(res, 200, { message: 'Profile image updated', user });
});

// --- Deactivation / soft delete ---

const deactivateMyAccount = asyncHandler(async (req, res) => {
  await userService.deactivateOwnAccount(req.user._id);
  sendSuccess(res, 200, { message: 'Account deactivated. You have been logged out everywhere.' });
});

// Admin-only: enable/disable another user's account
const setUserActive = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'Use the self-deactivation endpoint for your own account.');
  }
  const { isActive } = req.body;
  const user = await userService.setUserActive({ targetUserId: req.params.id, isActive });
  sendSuccess(res, 200, { message: `Account ${isActive ? 'activated' : 'deactivated'}`, user });
});

// Admin-only: soft delete another user's account
const softDeleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account through this endpoint.');
  }
  await userService.softDeleteUser(req.params.id);
  sendSuccess(res, 200, { message: 'Account deleted' });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  listFavorites,
  addFavorite,
  removeFavorite,
  uploadProfileImage,
  deactivateMyAccount,
  setUserActive,
  softDeleteUser
};
