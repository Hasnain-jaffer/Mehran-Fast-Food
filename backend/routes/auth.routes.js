/**
 * Auth Routes
 * POST   /api/auth/register            - Create account (always role: customer)
 * POST   /api/auth/login               - Authenticate, returns access + refresh token
 * POST   /api/auth/refresh             - Exchange a refresh token for a new pair (rotates it)
 * POST   /api/auth/logout              - Invalidate one refresh token (this device)
 * POST   /api/auth/logout-all          - Invalidate every refresh token (all devices)
 * GET    /api/auth/me                  - Current authenticated user
 * GET    /api/auth/sessions            - List this user's active sessions/devices
 * DELETE /api/auth/sessions/:sessionId - Revoke one specific session
 * GET    /api/auth/login-history       - This user's recent login attempts
 * PATCH  /api/auth/users/:id/role      - manager/admin/superAdmin promotes/demotes a user
 * POST   /api/auth/staff               - manager/admin/superAdmin creates a staff account directly
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const { ADMIN_LEVEL } = require('../constants/roles');
const {
  registerValidators,
  loginValidators,
  refreshValidators,
  roleUpdateValidators,
  createStaffValidators
} = require('../validators/auth.validators');

router.post('/register', authLimiter, registerValidators, validate, authController.register);
router.post('/login', authLimiter, loginValidators, validate, authController.login);
router.post('/refresh', authLimiter, refreshValidators, validate, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.me);

router.get('/sessions', authenticate, authController.listSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);
router.get('/login-history', authenticate, authController.loginHistory);

router.patch(
  '/users/:id/role',
  authenticate,
  authorize(...ADMIN_LEVEL),
  roleUpdateValidators,
  validate,
  authController.updateUserRole
);

router.post(
  '/staff',
  authenticate,
  authorize(...ADMIN_LEVEL),
  createStaffValidators,
  validate,
  authController.createStaffAccount
);

module.exports = router;
