const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RESET_TOKEN_PATTERN,
  generateResetToken,
  hashResetToken,
  getResetTokenExpiryMinutes,
  getResetTokenExpiry,
} = require('../utils/tokens');

test('reset tokens are 32 random bytes represented as hex', () => {
  const first = generateResetToken();
  const second = generateResetToken();

  assert.match(first, RESET_TOKEN_PATTERN);
  assert.match(second, RESET_TOKEN_PATTERN);
  assert.equal(first.length, 64);
  assert.notEqual(first, second);
});

test('reset tokens are hashed before storage', () => {
  const token = generateResetToken();
  const hash = hashResetToken(token);

  assert.notEqual(hash, token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hashResetToken(token), hash);
  assert.notEqual(hashResetToken(`${token}0`), hash);
});

test('reset token lifetime defaults to 15 minutes and is bounded', () => {
  assert.equal(getResetTokenExpiryMinutes({}), 15);
  assert.equal(getResetTokenExpiryMinutes({ RESET_TOKEN_EXPIRY_MINUTES: '30' }), 30);
  assert.equal(getResetTokenExpiryMinutes({ RESET_TOKEN_EXPIRY_MINUTES: '0' }), 1);
  assert.equal(getResetTokenExpiryMinutes({ RESET_TOKEN_EXPIRY_MINUTES: '999' }), 60);
  assert.equal(getResetTokenExpiryMinutes({ RESET_TOKEN_EXPIRY_MINUTES: 'nope' }), 15);
});

test('reset token expiry is calculated from the supplied clock', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const expiresAt = getResetTokenExpiry({ now, minutes: 15 });

  assert.equal(expiresAt.toISOString(), '2026-01-01T00:15:00.000Z');
});
