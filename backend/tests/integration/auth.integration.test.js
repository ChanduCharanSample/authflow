/**
 * Full API integration test.
 *
 * This is skipped unless TEST_MONGODB_URI is set, so the default `npm test`
 * never depends on a running database and never touches Atlas. To run it
 * against a disposable local database:
 *
 *   $env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/authflow_integration_test"
 *   npm run test:integration
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  'integration-test-secret-that-is-definitely-long-enough-1234567890';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.RESET_TOKEN_EXPIRY_MINUTES = '15';
process.env.EMAIL_USER = 'test-mailer@example.com';
process.env.EMAIL_PASS = 'test-app-password';
process.env.EMAIL_HOST = '127.0.0.1';
process.env.EMAIL_PORT = '2525';
process.env.EMAIL_SECURE = 'false';
process.env.PASSWORD_RESET_ENABLED = 'true';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const request = require('supertest');
const { hashResetToken } = require('../../utils/tokens');

const TEST_URI = process.env.TEST_MONGODB_URI;

describe('complete authentication flow', { skip: !TEST_URI }, () => {
  let app;
  let User;
  let agent;
  let secondAgent;

  const email = 'integration.user@example.com';
  const originalPassword = 'OriginalPass123';
  const newPassword = 'BrandNewPass456';

  before(async () => {
    if (!/test/i.test(TEST_URI)) {
      throw new Error(
        'Refusing to run: TEST_MONGODB_URI must contain "test" in the database name.'
      );
    }

    ({ app } = require('../../server'));
    User = require('../../models/User');

    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 10000 });
    await User.init();
    await User.deleteMany({});

    agent = request.agent(app);
    secondAgent = request.agent(app);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('registers a user and stores only a bcrypt hash', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Integration User',
      email: 'Integration.User@Example.COM',
      password: originalPassword,
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.email, email);
    assert.equal(response.body.user.password, undefined);

    const stored = await User.findOne({ email }).select('+password');
    assert.ok(stored);
    assert.notEqual(stored.password, originalPassword);
    assert.match(stored.password, /^\$2[aby]\$12\$/);
    assert.equal(await bcrypt.compare(originalPassword, stored.password), true);
    assert.equal(stored.tokenVersion, 0);
  });

  test('rejects duplicate registration', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Another User',
      email,
      password: 'AnotherPass123',
    });

    assert.equal(response.status, 409);
    assert.match(response.body.message, /already exists/i);
  });

  test('rejects incorrect credentials with a generic message', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email,
      password: 'WrongPassword123',
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Invalid email or password.');
  });

  test('logs in, sets an HttpOnly cookie, and returns no token in JSON', async () => {
    const response = await agent.post('/api/auth/login').send({
      email,
      password: originalPassword,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, email);
    assert.equal(response.body.user.password, undefined);
    assert.equal(response.body.token, undefined);

    const setCookie = response.headers['set-cookie']?.[0] || '';
    assert.match(setCookie, /^auth_token=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.doesNotMatch(setCookie, /Secure/);
  });

  test('protects /me without a cookie and returns the profile with one', async () => {
    const unauthenticated = await request(app).get('/api/auth/me');
    assert.equal(unauthenticated.status, 401);

    const authenticated = await agent.get('/api/auth/me');
    assert.equal(authenticated.status, 200);
    assert.equal(authenticated.body.user.email, email);
    assert.equal(authenticated.body.user.password, undefined);
  });

  test('forgot password returns the same response and never exposes a token', async () => {
    const existing = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email });
    const missing = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    assert.equal(existing.status, 200);
    assert.equal(missing.status, 200);
    assert.equal(existing.body.message, missing.body.message);
    assert.match(existing.body.message, /If an account exists/);
    assert.equal(existing.body.token, undefined);
    assert.equal(existing.body.resetUrl, undefined);
    assert.doesNotMatch(JSON.stringify(existing.body), /[a-f0-9]{64}/i);
  });

  test('reset password rejects invalid and expired tokens', async () => {
    const invalid = await request(app)
      .post(`/api/auth/reset-password/${'a'.repeat(64)}`)
      .send({ password: newPassword, confirmPassword: newPassword });

    assert.equal(invalid.status, 400);
    assert.match(invalid.body.message, /invalid or has expired/i);

    await User.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: hashResetToken('b'.repeat(64)),
          resetPasswordExpires: new Date(Date.now() - 60 * 1000),
        },
      }
    );

    const expired = await request(app)
      .post(`/api/auth/reset-password/${'b'.repeat(64)}`)
      .send({ password: newPassword, confirmPassword: newPassword });

    assert.equal(expired.status, 400);
  });

  test('reset password consumes a valid token and invalidates the previous session', async () => {
    const rawToken = 'c'.repeat(64);

    await User.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: hashResetToken(rawToken),
          resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
        },
      }
    );

    const response = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ password: newPassword, confirmPassword: newPassword });

    assert.equal(response.status, 200);
    assert.match(response.body.message, /Password reset successfully/);
    assert.equal(response.body.user, undefined);
    assert.equal(response.body.password, undefined);

    const stored = await User.findOne({ email }).select(
      '+password +resetPasswordToken +resetPasswordExpires'
    );
    assert.equal(stored.tokenVersion, 1);
    assert.equal(stored.resetPasswordToken, undefined);
    assert.equal(stored.resetPasswordExpires, undefined);
    assert.equal(await bcrypt.compare(newPassword, stored.password), true);
    assert.equal(await bcrypt.compare(originalPassword, stored.password), false);

    const oldSession = await agent.get('/api/auth/me');
    assert.equal(oldSession.status, 401);

    const reused = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'AnotherPass789', confirmPassword: 'AnotherPass789' });
    assert.equal(reused.status, 400);
  });

  test('rejects the old password and accepts the new password', async () => {
    const oldLogin = await request(app).post('/api/auth/login').send({
      email,
      password: originalPassword,
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await secondAgent.post('/api/auth/login').send({
      email,
      password: newPassword,
    });
    assert.equal(newLogin.status, 200);

    const me = await secondAgent.get('/api/auth/me');
    assert.equal(me.status, 200);
  });

  test('logout clears the cookie and closes the protected page session', async () => {
    const response = await secondAgent.post('/api/auth/logout');

    assert.equal(response.status, 200);
    const setCookie = response.headers['set-cookie']?.[0] || '';
    assert.match(setCookie, /^auth_token=/);
    assert.match(setCookie, /Expires=Thu, 01 Jan 1970/);

    const me = await secondAgent.get('/api/auth/me');
    assert.equal(me.status, 401);
  });
});
