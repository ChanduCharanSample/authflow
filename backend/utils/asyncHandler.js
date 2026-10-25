/**
 * Wrap an async route handler so rejected promises are passed to Express's
 * error middleware. Express 5 handles this natively, but wrapping keeps the
 * behaviour explicit and works with older Express versions too.
 */
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

module.exports = asyncHandler;
