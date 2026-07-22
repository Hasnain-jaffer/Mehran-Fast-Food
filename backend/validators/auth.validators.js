const { body } = require('express-validator');
const { ASSIGNABLE_ROLES, STAFF_ROLES } = require('../constants/roles');

// Reused for register + create-staff — enterprise password policy per
// OWASP guidance: length matters far more than forced character-class
// mixing, but we require a minimum of one letter and one number to avoid
// trivially weak all-numeric/all-repeated passwords.
const passwordValidator = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
  .matches(/[0-9]/).withMessage('Password must contain at least one number');

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
  passwordValidator,
  // Defense in depth: even though the service ignores req.body.role
  // entirely, reject the request outright if someone tries to send one.
  // This makes the "no self-assigned roles" rule visible at the API
  // boundary, not just buried in service logic.
  body('role').not().exists().withMessage('Role cannot be set during registration')
];

const loginValidators = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('rememberMe').optional().isBoolean().withMessage('rememberMe must be true or false')
];

const refreshValidators = [
  // Optional here: the token may arrive via the httpOnly cookie instead of
  // the body (see utils/cookies.js). authService.refresh() still throws a
  // 400 if it's missing from both sources.
  body('refreshToken').optional().isString()
];

const roleUpdateValidators = [
  body('role').isIn(ASSIGNABLE_ROLES).withMessage(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`)
];

const createStaffValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
  passwordValidator,
  body('role').isIn(STAFF_ROLES).withMessage(`Role must be one of: ${STAFF_ROLES.join(', ')}`)
];

const revokeSessionValidators = [
  body('sessionId').optional().isString()
];

module.exports = {
  registerValidators,
  loginValidators,
  refreshValidators,
  roleUpdateValidators,
  createStaffValidators,
  revokeSessionValidators
};
