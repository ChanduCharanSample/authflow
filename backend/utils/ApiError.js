/**
 * An error that carries an HTTP status code and a message that is safe to send
 * to the client. Unexpected errors are converted to a generic 500 response by
 * the error middleware.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = ApiError;
