const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found.' });
};

const redactSensitiveText = (value) =>
  String(value || '')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted-mongodb-uri]')
    .replace(/\b[a-f0-9]{64}\b/gi, '[redacted-token]')
    .replace(/(password|pass|token|secret)=([^&\s]+)/gi, '$1=[redacted]');

/**
 * Central error handler. Only ApiError messages and known validation/database
 * messages are exposed; unexpected errors return a generic 500 response.
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON body.';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message =
      Object.values(err.errors || {})[0]?.message || 'Validation failed.';
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'An account with this email already exists.';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid request.';
  }

  if (statusCode >= 500) {
    // A 503 from the service layer is intentional and safe to explain (for
    // example, password reset is disabled until email is configured). Other
    // 5xx errors are masked so internals are never exposed.
    const isServiceUnavailable = err.isOperational && statusCode === 503;

    if (!isServiceUnavailable) {
      const errorCode = err.code ? ` (${err.code})` : '';
      console.error(
        `[server] Unhandled error: ${err.name || 'Error'}${errorCode}`
      );

      if (process.env.NODE_ENV !== 'production') {
        console.error(redactSensitiveText(err.stack || err.message));
      }

      message = 'Something went wrong. Please try again later.';
    }
  }

  res.status(statusCode).json({ message });
};

module.exports = { notFound, errorHandler };
