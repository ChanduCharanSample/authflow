const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/userRepository');
const emailService = require('../utils/emailService');
const { hashPassword, verifyPassword } = require('../utils/password');
const { getJwtSecret } = require('../config/auth');
const { getFrontendUrl } = require('../config/urls');
const {
  RESET_TOKEN_PATTERN,
  generateResetToken,
  hashResetToken,
  getResetTokenExpiryMinutes,
  getResetTokenExpiry,
} = require('../utils/tokens');

const JWT_EXPIRES_IN = '7d';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

const isPasswordResetEnabled = (env = process.env) =>
  String(env.PASSWORD_RESET_ENABLED ?? 'true').toLowerCase() !== 'false';

const toSafeUser = (user) => {
  if (typeof user.toSafeJSON === 'function') return user.toSafeJSON();
  return {
    id: String(user.id ?? user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
};

/**
 * Build the auth service with injectable dependencies so it can be unit tested
 * without a database or a real SMTP connection.
 */
const createAuthService = ({
  users = userRepository,
  mailer = emailService,
  env = process.env,
  clock = () => new Date(),
} = {}) => {
  const registerUser = async ({ name, email, password }) => {
    const normalizedEmail = normalizeEmail(email);

    try {
      // Hash explicitly in the service so the repository only ever receives a
      // password hash. The User model has a pre-save safety guard as well.
      const passwordHash = await hashPassword(password);

      const user = await users.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: passwordHash,
      });

      return {
        message: 'Account created successfully. Please log in.',
        user: toSafeUser(user),
      };
    } catch (error) {
      if (error && error.code === 11000) {
        throw new ApiError(409, 'An account with this email already exists.');
      }
      throw error;
    }
  };

  const loginUser = async ({ email, password }) => {
    const user = await users.findByEmail(normalizeEmail(email), {
      includePassword: true,
    });

    const passwordMatches =
      Boolean(user && user.password) &&
      (await verifyPassword(password, user.password));

    // The same generic message is used for an unknown email and a wrong
    // password so the endpoint cannot be used to enumerate accounts.
    if (!passwordMatches) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const token = jwt.sign(
      { tokenVersion: Number(user.tokenVersion || 0) },
      getJwtSecret(env),
      {
        subject: String(user._id ?? user.id),
        expiresIn: JWT_EXPIRES_IN,
      }
    );

    return {
      message: 'Logged in successfully.',
      token,
      user: toSafeUser(user),
    };
  };

  const forgotPassword = async ({ email }) => {
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      normalizedEmail.length > 254 ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      throw new ApiError(400, 'Please enter a valid email address.');
    }

    if (!isPasswordResetEnabled(env) || !mailer.isConfigured()) {
      throw new ApiError(
        503,
        'Password reset is currently unavailable. Please try again later.'
      );
    }

    const user = await users.findByEmail(normalizedEmail);

    // Always return the same response so this endpoint does not reveal whether
    // an account exists for the supplied address.
    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    const userId = String(user._id ?? user.id);
    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expiresInMinutes = getResetTokenExpiryMinutes(env);
    const expiresAt = getResetTokenExpiry({
      now: clock(),
      minutes: expiresInMinutes,
    });

    await users.setResetToken({ userId, tokenHash, expiresAt });

    const resetUrl = `${getFrontendUrl(env)}/reset-password/${rawToken}`;

    try {
      await mailer.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes,
      });
    } catch (error) {
      // Never expose or log the reset token. Clear the unused token so a failed
      // delivery cannot leave a usable reset link behind.
      await users.clearResetToken({ userId });
      console.error(
        '[email] Password reset email delivery failed.',
        error?.code || error?.name || 'unknown_error'
      );
    }

    return { message: GENERIC_RESET_MESSAGE };
  };

  const resetPassword = async ({ token, password, confirmPassword }) => {
    if (!isPasswordResetEnabled(env)) {
      throw new ApiError(
        503,
        'Password reset is currently unavailable. Please try again later.'
      );
    }

    if (password !== confirmPassword) {
      throw new ApiError(400, 'Passwords do not match.');
    }

    if (typeof password !== 'string' || password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters long.');
    }

    if (password.length > 128) {
      throw new ApiError(400, 'Password must be at most 128 characters long.');
    }

    if (typeof token !== 'string' || !RESET_TOKEN_PATTERN.test(token)) {
      throw new ApiError(
        400,
        'This password reset link is invalid or has expired.'
      );
    }

    const passwordHash = await hashPassword(password);

    // The repository atomically checks the hash and expiry, consumes the token,
    // updates the password, and increments tokenVersion.
    const updatedUser = await users.resetPasswordWithToken({
      tokenHash: hashResetToken(token),
      passwordHash,
      now: clock(),
    });

    if (!updatedUser) {
      throw new ApiError(
        400,
        'This password reset link is invalid or has expired.'
      );
    }

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  };

  return {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
  };
};

const authService = createAuthService();

module.exports = authService;
module.exports.createAuthService = createAuthService;
module.exports.normalizeEmail = normalizeEmail;
module.exports.GENERIC_RESET_MESSAGE = GENERIC_RESET_MESSAGE;
