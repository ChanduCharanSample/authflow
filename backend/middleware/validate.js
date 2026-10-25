const { validationResult } = require('express-validator');

/**
 * Convert express-validator's result into a consistent JSON error response.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) return next();

  const errors = result.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return res.status(400).json({
    message: errors[0]?.message || 'Validation failed.',
    errors,
  });
};

const normalizeEmailValue = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

module.exports = { validate, normalizeEmailValue };
