const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiters');
const { validate } = require('../middleware/validate');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('../middleware/validators');

const router = express.Router();

router.post(
  '/register',
  registerLimiter,
  ...registerValidation,
  validate,
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  ...loginValidation,
  validate,
  authController.login
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  ...forgotPasswordValidation,
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password/:token',
  passwordResetLimiter,
  ...resetPasswordValidation,
  validate,
  authController.resetPassword
);

router.get('/me', protect, authController.me);

// Logout is intentionally unauthenticated: clearing the cookie is always safe
// and lets the frontend recover from an expired session.
router.post('/logout', authController.logout);

module.exports = router;
