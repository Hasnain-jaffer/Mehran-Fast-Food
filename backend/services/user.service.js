/**
 * User Service
 * Profile management, addresses, favorites/wishlist, password reset,
 * account deactivation, and soft delete. Keeps the same "service holds
 * logic, controller stays thin" pattern as auth.service.js/order.service.js.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const uploadService = require('./upload.service');
const { toPublicUser } = require('./auth.service');

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

// --- Profile -------------------------------------------------------------

async function getProfile(userId) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');
  return toPublicUser(user);
}

// Only a safe, explicit whitelist of fields can ever be updated here —
// role, phone, isActive, etc. all have their own dedicated, more carefully
// guarded flows and must never be editable through a generic "update
// profile" endpoint.
async function updateProfile({ userId, name }) {
  const user = await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    { ...(name !== undefined && { name }) },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, 'User not found');
  return toPublicUser(user);
}

// --- Password change / reset ----------------------------------------------

// Self-service change: requires the current password, for a user who is
// already logged in and simply wants to rotate their password.
async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findOne({ _id: userId, deletedAt: null }).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Changing your password is a strong signal you want any other
  // session/device logged out too (e.g. you suspect compromise).
  user.refreshTokens = [];
  await user.save();
}

// Forgot-password flow, step 1: issue a reset token.
//
// IMPORTANT — HONEST LIMITATION: this project has no email or SMS
// provider configured (no SendGrid/Twilio/etc. credentials exist in
// .env.example). Rather than fake a "we sent you a text" message that
// doesn't actually send anything, this function returns the raw token
// directly in non-production environments so the flow is testable
// end-to-end, and logs a clear warning in all environments. Wire this up
// to a real SMS/email provider before relying on this in production — see
// docs/PHASE3_USER_MANAGEMENT.md for exactly what to change.
async function requestPasswordReset({ phone }) {
  const user = await User.findOne({ phone, deletedAt: null });

  // Deliberately do not reveal whether the phone number exists — always
  // return the same shape either way to avoid account enumeration.
  if (!user) {
    return { message: 'If that account exists, a reset code has been issued.' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  await user.save();

  console.warn(
    `[password-reset] No SMS/email provider configured — reset token for ${phone} ` +
    `would normally be sent via SMS. Token (dev-only visibility): ${rawToken}`
  );

  const response = { message: 'If that account exists, a reset code has been issued.' };
  if (process.env.NODE_ENV !== 'production') {
    // Only surfaced outside production so this is testable without a real
    // SMS integration — never returned to the client in production.
    response.devOnlyResetToken = rawToken;
  }
  return response;
}

// Forgot-password flow, step 2: consume the token, set the new password.
async function resetPassword({ phone, token, newPassword }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    phone,
    deletedAt: null,
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset code');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.refreshTokens = []; // force re-login everywhere after a reset
  await user.save();
}

// --- Addresses -------------------------------------------------------------

async function listAddresses(userId) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');
  return user.addresses;
}

async function addAddress({ userId, street, landmark, city, isDefault }) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }
  // First address a user ever adds becomes default automatically, even if
  // they didn't tick the box — there should never be zero default
  // addresses once at least one exists.
  const shouldBeDefault = isDefault || user.addresses.length === 0;

  user.addresses.push({ street, landmark, city, isDefault: shouldBeDefault });
  await user.save();
  return user.addresses;
}

async function updateAddress({ userId, addressId, street, landmark, city, isDefault }) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Address not found');

  if (street !== undefined) address.street = street;
  if (landmark !== undefined) address.landmark = landmark;
  if (city !== undefined) address.city = city;
  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
    address.isDefault = true;
  }

  await user.save();
  return user.addresses;
}

async function deleteAddress({ userId, addressId }) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Address not found');

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Promote another address to default if the deleted one was it —
  // otherwise the user could end up with addresses but no default.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user.addresses;
}

// --- Favorites / Wishlist ---------------------------------------------------

async function listFavorites(userId) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');
  return user.favorites;
}

async function addFavorite({ userId, refType, refId }) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  const alreadyFavorited = user.favorites.some(
    (f) => f.refType === refType && f.refId.toString() === refId
  );
  if (alreadyFavorited) return user.favorites;

  user.favorites.push({ refType, refId });
  await user.save();
  return user.favorites;
}

async function removeFavorite({ userId, refType, refId }) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  user.favorites = user.favorites.filter(
    (f) => !(f.refType === refType && f.refId.toString() === refId)
  );
  await user.save();
  return user.favorites;
}

// --- Profile image -----------------------------------------------------

async function updateProfileImage({ userId, fileBuffer }) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  const oldPublicId = user.profileImage?.publicId;

  const { url, publicId } = await uploadService.uploadProfileImage({ buffer: fileBuffer, userId: user._id.toString() });
  user.profileImage = { url, publicId };
  await user.save();

  // Clean up the previous image AFTER the new one is confirmed saved —
  // never delete the old image first, or a failed upload would leave the
  // user with no profile image at all.
  if (oldPublicId) {
    await uploadService.deleteImage(oldPublicId);
  }

  return toPublicUser(user);
}

// --- Account deactivation & soft delete -----------------------------------

// Self-service: the user deactivates their own account (e.g. "I want a
// break from the app" or "close my account for now"). Distinct from an
// admin forcibly disabling someone else's account — same underlying
// isActive flag, but this path is always self-targeted and also logs the
// user out of every device.
async function deactivateOwnAccount(userId) {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  user.isActive = false;
  user.refreshTokens = [];
  await user.save();
}

// Admin action: enable/disable ANY user's account (staff or customer).
async function setUserActive({ targetUserId, isActive }) {
  const user = await User.findOne({ _id: targetUserId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  user.isActive = isActive;
  if (!isActive) {
    user.refreshTokens = []; // immediately end any active sessions when disabling
  }
  await user.save();
  return toPublicUser(user);
}

// Soft delete: the document is kept (order history, referential
// integrity) but the account becomes permanently inaccessible and
// excluded from normal reads. Distinct from `isActive: false`, which is
// reversible business-as-usual account suspension — soft delete
// represents an intentional removal decision.
async function softDeleteUser(targetUserId) {
  const user = await User.findOne({ _id: targetUserId, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');

  user.deletedAt = new Date();
  user.isActive = false;
  user.refreshTokens = [];
  await user.save();
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  listFavorites,
  addFavorite,
  removeFavorite,
  updateProfileImage,
  deactivateOwnAccount,
  setUserActive,
  softDeleteUser
};
