const crypto = require('node:crypto');

const DEFAULT_RESET_TOKEN_EXPIRY_MINUTES = 15;
const MIN_RESET_TOKEN_EXPIRY_MINUTES = 1;
const MAX_RESET_TOKEN_EXPIRY_MINUTES = 60;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

const generateResetToken = () =>
  crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const getResetTokenExpiryMinutes = (env = process.env) => {
  const parsed = Number.parseInt(env.RESET_TOKEN_EXPIRY_MINUTES, 10);

  if (!Number.isFinite(parsed)) return DEFAULT_RESET_TOKEN_EXPIRY_MINUTES;

  return Math.min(
    MAX_RESET_TOKEN_EXPIRY_MINUTES,
    Math.max(MIN_RESET_TOKEN_EXPIRY_MINUTES, parsed)
  );
};

const getResetTokenExpiry = ({
  now = new Date(),
  minutes = DEFAULT_RESET_TOKEN_EXPIRY_MINUTES,
} = {}) =>
  new Date(now.getTime() + Number(minutes) * 60 * 1000);

module.exports = {
  DEFAULT_RESET_TOKEN_EXPIRY_MINUTES,
  MIN_RESET_TOKEN_EXPIRY_MINUTES,
  MAX_RESET_TOKEN_EXPIRY_MINUTES,
  RESET_TOKEN_PATTERN,
  generateResetToken,
  hashResetToken,
  getResetTokenExpiryMinutes,
  getResetTokenExpiry,
};
