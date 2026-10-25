const { rateLimit } = require('express-rate-limit');

const skipInTests = () => process.env.NODE_ENV === 'test';

const createLimiter = (options) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: skipInTests,
    ...options,
  });

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: {
    message:
      'Too many accounts created from this IP. Please try again in an hour.',
  },
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    message:
      'Too many login attempts. Please wait 15 minutes and try again.',
  },
});

const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    message:
      'Too many password reset attempts. Please wait 15 minutes and try again.',
  },
});

module.exports = { registerLimiter, loginLimiter, passwordResetLimiter };
