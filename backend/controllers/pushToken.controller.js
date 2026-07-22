const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

const register = asyncHandler(async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) throw new ApiError(400, 'Push token is required');
  await User.findByIdAndUpdate(req.user._id, { pushToken });
  res.json({ message: 'Push token registered successfully' });
});

module.exports = { register };
