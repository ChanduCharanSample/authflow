const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hashPassword,
  verifyPassword,
  isBcryptHash,
} = require('../utils/password');

test('passwords are hashed with bcrypt and verify correctly', async () => {
  const plain = 'DemoPassword123';
  const hash = await hashPassword(plain);

  assert.notEqual(hash, plain);
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword(plain, hash), true);
  assert.equal(await verifyPassword('WrongPassword123', hash), false);
});

test('bcrypt hash detection rejects plaintext values', async () => {
  const hash = await hashPassword('DemoPassword123');

  assert.equal(isBcryptHash(hash), true);
  assert.equal(isBcryptHash('DemoPassword123'), false);
  assert.equal(isBcryptHash(''), false);
  assert.equal(isBcryptHash(undefined), false);
});
