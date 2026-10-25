const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getAuthCookieOptions,
  getAuthCookieClearOptions,
} = require('../utils/cookies');
const { getFrontendOrigins } = require('../config/urls');

test('production uses cross-site Secure cookies for Vercel-to-Render requests', () => {
  const env = { NODE_ENV: 'production', COOKIE_SAME_SITE: 'none' };
  const options = getAuthCookieOptions(env);
  const clearOptions = getAuthCookieClearOptions(env);

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'none');
  assert.equal(options.secure, true);
  assert.equal(clearOptions.sameSite, 'none');
  assert.equal(clearOptions.secure, true);
});

test('development defaults to Lax non-Secure cookies', () => {
  const options = getAuthCookieOptions({ NODE_ENV: 'development' });

  assert.equal(options.sameSite, 'lax');
  assert.equal(options.secure, false);
});

test('invalid cookie SameSite configuration is rejected', () => {
  assert.throws(
    () => getAuthCookieOptions({ NODE_ENV: 'production', COOKIE_SAME_SITE: 'invalid' }),
    /COOKIE_SAME_SITE/
  );
});

test('production CORS requires an explicit HTTPS frontend origin', () => {
  assert.deepEqual(
    getFrontendOrigins({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://authflow.vercel.app',
    }),
    ['https://authflow.vercel.app']
  );

  assert.throws(
    () =>
      getFrontendOrigins({
        NODE_ENV: 'production',
        FRONTEND_URL: 'http://localhost:5173',
      }),
    /HTTPS|localhost/
  );

  assert.throws(
    () => getFrontendOrigins({ NODE_ENV: 'production' }),
    /FRONTEND_URL is required/
  );
});

test('development CORS falls back to the local frontend', () => {
  assert.deepEqual(getFrontendOrigins({ NODE_ENV: 'development' }), [
    'http://localhost:5173',
  ]);
});
