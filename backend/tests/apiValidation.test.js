process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  'api-test-secret-that-is-definitely-long-enough-1234567890';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
process.env.PASSWORD_RESET_ENABLED = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');

test('health endpoint responds without requiring the database', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('registration rejects invalid input before touching the database', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'A',
    email: 'not-an-email',
    password: 'short',
  });

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.errors));
  assert.ok(response.body.errors.length >= 2);
});

test('login requires an email and password', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'not-an-email' });

  assert.equal(response.status, 400);
  assert.ok(response.body.errors.some((error) => error.field === 'email'));
  assert.ok(response.body.errors.some((error) => error.field === 'password'));
});

test('protected /me rejects requests without a cookie', async () => {
  const response = await request(app).get('/api/auth/me');

  assert.equal(response.status, 401);
  assert.match(response.body.message, /Authentication required/);
});

test('protected /me rejects an invalid cookie', async () => {
  const response = await request(app)
    .get('/api/auth/me')
    .set('Cookie', 'auth_token=not-a-real-jwt');

  assert.equal(response.status, 401);
  assert.match(response.body.message, /invalid or has expired/);
});

test('forgot password validates the email format', async () => {
  const response = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'not-an-email' });

  assert.equal(response.status, 400);
  assert.ok(response.body.errors.some((error) => error.field === 'email'));
});

test('forgot password returns a clear 503 when email is not configured', async () => {
  const response = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'demo@example.com' });

  assert.equal(response.status, 503);
  assert.match(response.body.message, /currently unavailable/i);
});

test('reset password rejects an invalid token and invalid password fields', async () => {
  const response = await request(app)
    .post('/api/auth/reset-password/not-a-token')
    .send({
      password: 'short',
      confirmPassword: 'different',
    });

  assert.equal(response.status, 400);
  assert.ok(response.body.errors.some((error) => error.field === 'token'));
  assert.ok(response.body.errors.some((error) => error.field === 'password'));
  assert.ok(
    response.body.errors.some((error) => error.field === 'confirmPassword')
  );
});

test('reset password rejects mismatched passwords before touching the database', async () => {
  const response = await request(app)
    .post(`/api/auth/reset-password/${'a'.repeat(64)}`)
    .send({
      password: 'NewDemoPassword123',
      confirmPassword: 'DifferentPassword123',
    });

  assert.equal(response.status, 400);
  assert.ok(
    response.body.errors.some((error) => error.field === 'confirmPassword')
  );
});

test('the old direct-reset route is no longer available', async () => {
  const response = await request(app).post('/api/auth/reset-password').send({
    email: 'demo@example.com',
    password: 'NewDemoPassword123',
    confirmPassword: 'NewDemoPassword123',
  });

  assert.equal(response.status, 404);
});

test('logout clears the auth cookie', async () => {
  const response = await request(app).post('/api/auth/logout');

  assert.equal(response.status, 200);
  const cookie = response.headers['set-cookie']?.[0] || '';
  assert.match(cookie, /^auth_token=/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('CORS allows the configured frontend origin with credentials', async () => {
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'http://localhost:5173');

  assert.equal(
    response.headers['access-control-allow-origin'],
    'http://localhost:5173'
  );
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
});

test('unknown routes return JSON 404 responses', async () => {
  const response = await request(app).get('/api/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Route not found.');
});
