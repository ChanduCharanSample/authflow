const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getAuthCookieClearOptions,
} = require('../utils/cookies');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const { token, ...result } = await authService.loginUser(req.body);

  // The JWT lives only in this HttpOnly cookie; it is never returned in JSON
  // and must never be put in localStorage by the frontend.
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
  res.status(200).json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    token: req.params.token,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });
  res.status(200).json(result);
});

const me = (req, res) => {
  res.status(200).json({ user: req.user.toSafeJSON() });
};

const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieClearOptions());
  res.status(200).json({ message: 'Logged out successfully.' });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  logout,
};
