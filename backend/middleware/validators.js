const { body, param } = require('express-validator');
const { normalizeEmailValue } = require('./validate');
const { RESET_TOKEN_PATTERN } = require('../utils/tokens');

const emailRule = (field = 'email') =>
  body(field)
    .customSanitizer(normalizeEmailValue)
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .isLength({ max: 254 })
    .withMessage('Email address is too long.');

const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('Password is required.')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long.');

const confirmPasswordRule = (field = 'confirmPassword') =>
  body(field)
    .isString()
    .withMessage('Please confirm your new password.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    });

const resetTokenRule = () =>
  param('token')
    .isString()
    .withMessage('Reset token is required.')
    .matches(RESET_TOKEN_PATTERN)
    .withMessage('This password reset link is invalid or has expired.');

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters long.'),
  emailRule(),
  passwordRule(),
];

const loginValidation = [
  emailRule(),
  body('password')
    .isString()
    .withMessage('Password is required.')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ max: 128 })
    .withMessage('Password is too long.'),
];

const forgotPasswordValidation = [emailRule()];

const resetPasswordValidation = [
  resetTokenRule(),
  passwordRule(),
  confirmPasswordRule(),
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
