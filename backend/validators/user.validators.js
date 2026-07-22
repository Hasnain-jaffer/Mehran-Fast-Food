const { body, param } = require('express-validator');

const passwordValidator = (field) => body(field)
  .isLength({ min: 8 }).withMessage(`${field} must be at least 8 characters`)
  .matches(/[A-Za-z]/).withMessage(`${field} must contain at least one letter`)
  .matches(/[0-9]/).withMessage(`${field} must contain at least one number`);

const updateProfileValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 })
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  passwordValidator('newPassword')
];

const forgotPasswordValidators = [
  body('phone').trim().notEmpty().withMessage('Phone is required')
];

const resetPasswordValidators = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  passwordValidator('newPassword')
];

const addressValidators = [
  body('street').trim().notEmpty().withMessage('Street is required').isLength({ max: 200 }),
  body('landmark').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('city').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('isDefault').optional().isBoolean()
];

// Looser than addressValidators — used for PUT (update), where every
// field is optional since the caller may only want to change one thing
// (e.g. just flip isDefault) without resending the whole address.
const updateAddressValidators = [
  body('street').optional().trim().notEmpty().withMessage('Street cannot be empty').isLength({ max: 200 }),
  body('landmark').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('city').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('isDefault').optional().isBoolean()
];

const addressIdParamValidator = [
  param('addressId').isMongoId().withMessage('Invalid address id')
];

const favoriteValidators = [
  body('refType').isIn(['menuItem', 'deal']).withMessage('refType must be menuItem or deal'),
  body('refId').isMongoId().withMessage('Invalid refId')
];

const setActiveValidators = [
  body('isActive').isBoolean().withMessage('isActive must be true or false')
];

module.exports = {
  updateProfileValidators,
  changePasswordValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  addressValidators,
  updateAddressValidators,
  addressIdParamValidator,
  favoriteValidators,
  setActiveValidators
};
