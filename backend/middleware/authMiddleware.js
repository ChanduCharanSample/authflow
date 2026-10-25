const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const userRepository = require('../repositories/userRepository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { AUTH_COOKIE_NAME } = require('../utils/cookies');
const { getJwtSecret } = require('../config/auth');

/**
 * Require a valid JWT from the HttpOnly cookie. The user is always loaded from
 * the database; the frontend can never supply or choose a user id.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    throw new ApiError(
      401,
      'Your session is invalid or has expired. Please log in again.'
    );
  }

  if (!payload?.sub || !mongoose.isValidObjectId(payload.sub)) {
    throw new ApiError(
      401,
      'Your session is invalid or has expired. Please log in again.'
    );
  }

  const user = await userRepository.findById(payload.sub);

  if (!user) {
    throw new ApiError(
      401,
      'Your session is invalid or has expired. Please log in again.'
    );
  }

  const tokenVersion = Number(payload.tokenVersion || 0);
  if (tokenVersion !== Number(user.tokenVersion || 0)) {
    throw new ApiError(
      401,
      'Your session is no longer valid. Please log in again.'
    );
  }

  req.user = user;
  next();
});

module.exports = { protect };
