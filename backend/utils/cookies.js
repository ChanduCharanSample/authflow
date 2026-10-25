const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches JWT lifetime

const isProduction = (env = process.env) => env.NODE_ENV === 'production';

const getCookieSameSite = (env = process.env) => {
  const configured = String(env.COOKIE_SAME_SITE || '')
    .trim()
    .toLowerCase();

  if (configured) {
    if (!['lax', 'strict', 'none'].includes(configured)) {
      throw new Error('COOKIE_SAME_SITE must be one of: lax, strict, none.');
    }
    return configured;
  }

  // Vercel and Render normally use different sites, so production defaults to
  // a cross-site cookie. Set COOKIE_SAME_SITE=lax when both are on one site.
  return isProduction(env) ? 'none' : 'lax';
};

const getCookieSecure = (env = process.env) =>
  isProduction(env) || getCookieSameSite(env) === 'none';

const getAuthCookieOptions = (env = process.env) => ({
  httpOnly: true,
  sameSite: getCookieSameSite(env),
  secure: getCookieSecure(env),
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
});

/**
 * clearCookie needs the same path/secure/sameSite values so browsers remove
 * the exact cookie that was set. maxAge/expires are intentionally omitted.
 */
const getAuthCookieClearOptions = (env = process.env) => ({
  httpOnly: true,
  sameSite: getCookieSameSite(env),
  secure: getCookieSecure(env),
  path: '/',
});

module.exports = {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE_MS,
  getCookieSameSite,
  getCookieSecure,
  getAuthCookieOptions,
  getAuthCookieClearOptions,
};
