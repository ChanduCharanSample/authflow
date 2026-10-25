const ApiError = require('../utils/ApiError');

const JWT_PLACEHOLDER = 'YOUR_LONG_RANDOM_SECRET';
const MIN_SECRET_LENGTH = 32;

/**
 * Return the JWT signing secret or fail clearly. Secrets are only read from the
 * environment; there is no hardcoded fallback.
 */
const getJwtSecret = (env = process.env) => {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';

  if (
    !secret ||
    secret === JWT_PLACEHOLDER ||
    secret.length < MIN_SECRET_LENGTH
  ) {
    throw new ApiError(
      500,
      'Server authentication is not configured. Set a strong JWT_SECRET in backend/.env.'
    );
  }

  return secret;
};

module.exports = { getJwtSecret };
