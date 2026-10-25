const User = require('../models/User');

/**
 * All database access for users lives here. Services must not query Mongoose
 * models directly.
 */

const findByEmail = (email, { includePassword = false } = {}) => {
  const query = User.findOne({ email: String(email).trim().toLowerCase() });
  if (includePassword) query.select('+password');
  return query.exec();
};

const findById = (id, { includePassword = false } = {}) => {
  const query = User.findById(id);
  if (includePassword) query.select('+password');
  return query.exec();
};

const create = (userData) => User.create(userData);

const setResetToken = ({ userId, tokenHash, expiresAt }) =>
  User.updateOne(
    { _id: userId },
    {
      $set: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: expiresAt,
      },
    }
  );

const clearResetToken = ({ userId }) =>
  User.updateOne(
    { _id: userId },
    {
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
      },
    }
  );

/**
 * Atomically consume a reset token and update the password. The conditional
 * filter ensures the same token cannot be used twice, even if two requests
 * arrive concurrently. Returns null when the token is invalid or expired.
 */
const resetPasswordWithToken = ({ tokenHash, passwordHash, now = new Date() }) =>
  User.findOneAndUpdate(
    {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: now },
    },
    {
      $set: { password: passwordHash },
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
      },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: 'after' }
  );

module.exports = {
  findByEmail,
  findById,
  create,
  setResetToken,
  clearResetToken,
  resetPasswordWithToken,
};
