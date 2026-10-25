const { getJwtSecret } = require('./auth');
const { getFrontendOrigins } = require('./urls');
const { parseMongoUri } = require('./db');
const { getEmailConfig } = require('../utils/emailService');
const { getCookieSameSite, getCookieSecure } = require('../utils/cookies');

/**
 * Validate configuration that must be present before the API starts accepting
 * requests. Secrets are never printed by this function.
 */
const validateRuntimeConfig = (env = process.env) => {
  getJwtSecret(env);

  const mongoUri =
    typeof env.MONGODB_URI === 'string' ? env.MONGODB_URI.trim() : '';
  parseMongoUri(mongoUri);

  const frontendOrigins = getFrontendOrigins(env);
  const sameSite = getCookieSameSite(env);
  const secure = getCookieSecure(env);

  if (sameSite === 'none' && !secure) {
    throw new Error('COOKIE_SAME_SITE=none requires Secure cookies.');
  }

  const emailConfigured = Boolean(getEmailConfig(env));
  const passwordResetEnabled =
    String(env.PASSWORD_RESET_ENABLED ?? 'true').toLowerCase() !== 'false';

  if (passwordResetEnabled && !emailConfigured) {
    console.warn(
      '[config] Password reset is disabled because EMAIL_USER/EMAIL_PASS are not configured.'
    );
  }

  return {
    frontendOrigins,
    cookieSameSite: sameSite,
    cookieSecure: secure,
    passwordResetEnabled: passwordResetEnabled && emailConfigured,
  };
};

module.exports = { validateRuntimeConfig };
