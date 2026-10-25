const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

const verifyPassword = (plainPassword, passwordHash) =>
  bcrypt.compare(plainPassword, passwordHash);

/**
 * Used by the User model's pre-save guard so an already-hashed password is
 * never hashed a second time if a service has hashed it explicitly.
 */
const isBcryptHash = (value) =>
  typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);

module.exports = { SALT_ROUNDS, hashPassword, verifyPassword, isBcryptHash };
