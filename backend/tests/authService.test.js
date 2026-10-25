const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createAuthService } = require('../services/authService');
const {
  createFakeUserRepository,
  createFakeMailer,
} = require('./helpers/fakes');
const {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_PATTERN,
} = require('../utils/tokens');

const JWT_SECRET = 'test-secret-that-is-definitely-long-enough-1234567890';

const setup = ({ mailerOptions, envOverrides } = {}) => {
  const repository = createFakeUserRepository();
  const mailer = createFakeMailer(mailerOptions);
  let currentTime = new Date('2026-01-01T00:00:00.000Z');

  const env = {
    JWT_SECRET,
    FRONTEND_URL: 'http://localhost:5173',
    RESET_TOKEN_EXPIRY_MINUTES: '15',
    NODE_ENV: 'test',
    ...envOverrides,
  };

  const service = createAuthService({
    users: repository,
    mailer,
    env,
    clock: () => currentTime,
  });

  return {
    repository,
    mailer,
    env,
    service,
    getNow: () => currentTime,
    setNow: (value) => {
      currentTime = value;
    },
  };
};

const register = (service, overrides = {}) =>
  service.registerUser({
    name: 'Demo User',
    email: 'demo@example.com',
    password: 'DemoPassword123',
    ...overrides,
  });

const tokenFromMail = (mailer) => {
  const resetUrl = mailer.sent[0]?.resetUrl;
  assert.ok(resetUrl, 'expected a reset email');
  const token = new URL(resetUrl).pathname.split('/').pop();
  assert.match(token, RESET_TOKEN_PATTERN);
  return token;
};

test('registration normalizes email and stores only a bcrypt hash', async () => {
  const { service, repository } = setup();

  const result = await register(service, {
    name: '  Demo User  ',
    email: '  Demo@Example.COM ',
  });

  assert.equal(result.user.email, 'demo@example.com');
  assert.equal(result.user.name, 'Demo User');
  assert.equal(result.user.password, undefined);

  const stored = repository.users[0];
  assert.notEqual(stored.password, 'DemoPassword123');
  assert.match(stored.password, /^\$2[aby]\$12\$/);
  assert.equal(
    await bcrypt.compare('DemoPassword123', stored.password),
    true
  );
});

test('duplicate registration returns a 409-friendly error', async () => {
  const { service } = setup();
  await register(service);

  await assert.rejects(
    register(service),
    (error) =>
      error.statusCode === 409 &&
      error.message === 'An account with this email already exists.'
  );
});

test('a database failure during registration is not reported as success', async () => {
  const { service, repository } = setup();
  repository.create = async () => {
    throw new Error('database unavailable');
  };

  await assert.rejects(register(service), /database unavailable/);
});

test('login returns a JWT and safe user, and rejects bad credentials generically', async () => {
  const { service } = setup();
  await register(service);

  const result = await service.loginUser({
    email: 'DEMO@EXAMPLE.COM',
    password: 'DemoPassword123',
  });

  assert.ok(result.token);
  assert.equal(result.user.email, 'demo@example.com');
  assert.equal(result.user.password, undefined);

  const payload = jwt.verify(result.token, JWT_SECRET);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.tokenVersion, 0);

  const genericError = (error) =>
    error.statusCode === 401 && error.message === 'Invalid email or password.';

  await assert.rejects(
    service.loginUser({
      email: 'demo@example.com',
      password: 'WrongPassword123',
    }),
    genericError
  );

  await assert.rejects(
    service.loginUser({
      email: 'nobody@example.com',
      password: 'DemoPassword123',
    }),
    genericError
  );
});

test('forgot password stores only a token hash and emails a single-use link', async () => {
  const { service, repository, mailer, getNow } = setup();
  await register(service);

  const result = await service.forgotPassword({
    email: 'DEMO@EXAMPLE.COM',
  });

  assert.match(result.message, /If an account exists/);
  assert.equal(mailer.sent.length, 1);

  const token = tokenFromMail(mailer);
  const stored = repository.users[0];

  assert.notEqual(stored.resetPasswordToken, token);
  assert.equal(stored.resetPasswordToken, hashResetToken(token));
  assert.ok(stored.resetPasswordExpires > getNow());
  assert.equal(result.token, undefined);
  assert.equal(result.resetUrl, undefined);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
});

test('forgot password gives the same response for an unknown email and sends nothing', async () => {
  const { service, mailer } = setup();

  const result = await service.forgotPassword({
    email: 'missing@example.com',
  });

  assert.match(result.message, /If an account exists/);
  assert.equal(mailer.sent.length, 0);
});

test('forgot password is unavailable when email is not configured', async () => {
  const { service } = setup({ mailerOptions: { configured: false } });
  await register(service);

  await assert.rejects(
    service.forgotPassword({ email: 'demo@example.com' }),
    (error) =>
      error.statusCode === 503 && /currently unavailable/i.test(error.message)
  );
});

test('a failed email delivery clears the unused reset token', async () => {
  const { service, repository } = setup({ mailerOptions: { fail: true } });
  await register(service);

  const result = await service.forgotPassword({ email: 'demo@example.com' });

  assert.match(result.message, /If an account exists/);
  assert.equal(repository.users[0].resetPasswordToken, undefined);
  assert.equal(repository.users[0].resetPasswordExpires, undefined);
});

test('reset consumes the token, updates the hash, and invalidates old sessions', async () => {
  const { service, repository, mailer } = setup();
  await register(service);

  const oldLogin = await service.loginUser({
    email: 'demo@example.com',
    password: 'DemoPassword123',
  });
  assert.equal(jwt.verify(oldLogin.token, JWT_SECRET).tokenVersion, 0);

  await service.forgotPassword({ email: 'demo@example.com' });
  const token = tokenFromMail(mailer);

  const result = await service.resetPassword({
    token,
    password: 'NewDemoPassword123',
    confirmPassword: 'NewDemoPassword123',
  });

  assert.match(result.message, /Password reset successfully/);
  assert.equal(result.password, undefined);
  assert.equal(result.user, undefined);

  const stored = repository.users[0];
  assert.equal(stored.tokenVersion, 1);
  assert.equal(stored.resetPasswordToken, undefined);
  assert.equal(stored.resetPasswordExpires, undefined);
  assert.notEqual(stored.password, 'NewDemoPassword123');
  assert.match(stored.password, /^\$2[aby]\$12\$/);
  assert.equal(
    await bcrypt.compare('NewDemoPassword123', stored.password),
    true
  );
  assert.equal(await bcrypt.compare('DemoPassword123', stored.password), false);

  const newLogin = await service.loginUser({
    email: 'demo@example.com',
    password: 'NewDemoPassword123',
  });
  assert.equal(jwt.verify(newLogin.token, JWT_SECRET).tokenVersion, 1);

  await assert.rejects(
    service.loginUser({
      email: 'demo@example.com',
      password: 'DemoPassword123',
    }),
    (error) => error.statusCode === 401
  );
});

test('reset rejects invalid, expired, and reused tokens', async () => {
  const { service, repository, mailer, setNow } = setup();
  await register(service);

  await assert.rejects(
    service.resetPassword({
      token: 'a'.repeat(64),
      password: 'NewDemoPassword123',
      confirmPassword: 'NewDemoPassword123',
    }),
    (error) => error.statusCode === 400 && /invalid or has expired/i.test(error.message)
  );

  const user = repository.users[0];
  user.resetPasswordToken = hashResetToken('b'.repeat(64));
  user.resetPasswordExpires = new Date('2025-12-31T23:59:59.000Z');

  await assert.rejects(
    service.resetPassword({
      token: 'b'.repeat(64),
      password: 'NewDemoPassword123',
      confirmPassword: 'NewDemoPassword123',
    }),
    (error) => error.statusCode === 400
  );

  setNow(new Date('2026-01-01T00:00:00.000Z'));
  await service.forgotPassword({ email: 'demo@example.com' });
  const token = tokenFromMail(mailer);

  await service.resetPassword({
    token,
    password: 'NewDemoPassword123',
    confirmPassword: 'NewDemoPassword123',
  });

  await assert.rejects(
    service.resetPassword({
      token,
      password: 'AnotherPassword123',
      confirmPassword: 'AnotherPassword123',
    }),
    (error) => error.statusCode === 400
  );
});

test('reset rejects mismatched or short passwords', async () => {
  const { service } = setup();

  await assert.rejects(
    service.resetPassword({
      token: 'a'.repeat(64),
      password: 'NewDemoPassword123',
      confirmPassword: 'DifferentPassword123',
    }),
    (error) => error.statusCode === 400 && /do not match/.test(error.message)
  );

  await assert.rejects(
    service.resetPassword({
      token: 'a'.repeat(64),
      password: 'short',
      confirmPassword: 'short',
    }),
    (error) =>
      error.statusCode === 400 && /at least 8 characters/.test(error.message)
  );
});

test('reset is unavailable when password reset is explicitly disabled', async () => {
  const { service, repository, getNow } = setup({
    envOverrides: { PASSWORD_RESET_ENABLED: 'false' },
  });
  const result = await register(service);
  const token = generateResetToken();

  await repository.setResetToken({
    userId: result.user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(getNow().getTime() + 60_000),
  });

  await assert.rejects(
    service.resetPassword({
      token,
      password: 'NewDemoPassword123',
      confirmPassword: 'NewDemoPassword123',
    }),
    (error) =>
      error.statusCode === 503 && /currently unavailable/i.test(error.message)
  );
});
