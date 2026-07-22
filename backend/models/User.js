/**
 * User Model
 * Single model for customers, staff, admins, and superAdmins.
 * `role` determines access level — see constants/roles.js for the enum.
 */

const mongoose = require('mongoose');
const { ROLES } = require('../constants/roles');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  landmark: { type: String, default: '' },
  city: { type: String, default: 'Hyderabad' },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

// One entry per active refresh token (i.e. per logged-in device/session).
// We never store the raw refresh token — only a SHA-256 hash of it — so a
// database leak alone can't be used to impersonate a user.
const refreshTokenSchema = new mongoose.Schema({
  tokenId: { type: String, required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  // "Remember me" simply controls how long this specific refresh token
  // lives for (see utils/tokens.js) — a short session vs. a long-lived one.
  rememberMe: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now }
}, { _id: false });

// Append-only login history. Kept separate from `refreshTokens` (which
// represents *active* sessions and gets pruned/removed on logout) so a
// user's login activity is still visible even after they've logged out
// everywhere. Capped at a reasonable length per user (see auth.service.js)
// so this can't grow unboundedly for a very active account.
const loginHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  success: { type: Boolean, default: true },
  reason: { type: String, default: '' } // e.g. 'invalid_password', 'account_disabled'
}, { _id: false });

// One entry per item a customer has favorited/wishlisted — a plain
// embedded array is fine here since favorites lists are small (dozens at
// most), unlike refreshTokens/loginHistory which get pruned/capped.
const favoriteSchema = new mongoose.Schema({
  refType: { type: String, enum: ['menuItem', 'deal'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.CUSTOMER
  },
  // Account can be disabled by an admin without deleting order history.
  isActive: { type: Boolean, default: true },
  // Soft delete: the record stays (order history integrity), but the
  // account is treated as gone by all normal reads. Kept distinct from
  // `isActive` — a disabled account can still be reactivated by an admin
  // as a normal part of business (e.g. suspended pending review); a
  // soft-deleted account represents the user/admin choosing to remove it.
  deletedAt: { type: Date, default: null },
  lastLogin: { type: Date, default: null },
  addresses: [addressSchema],
  pushToken: { type: String, default: null },
  profileImage: {
    url: { type: String, default: null },
    publicId: { type: String, default: null } // Cloudinary public_id, needed to delete/replace the image later
  },
  favorites: { type: [favoriteSchema], default: [] },
  // Hashed (never raw) password-reset token + its expiry. Same hashing
  // rationale as refresh tokens — a database leak alone shouldn't be
  // enough to reset someone's password.
  passwordResetTokenHash: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
  refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  // Last 25 login attempts (success and failure) for this account.
  loginHistory: { type: [loginHistorySchema], default: [], select: false },
  // For staff/admin accounts created directly by an admin (see
  // services/auth.service.js `createStaffAccount`) — null for accounts
  // created through public self-registration.
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true // adds createdAt/updatedAt automatically
});

// Excludes soft-deleted users from any query using this helper — routes
// should generally query through this rather than remembering to add
// `deletedAt: null` by hand everywhere.
userSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, deletedAt: null });
};

// `phone` already gets a unique index from `unique: true` above.
// Role is indexed separately since admin dashboards frequently filter
// staff/admin users, and this keeps that query fast as the user base grows.
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('User', userSchema);
