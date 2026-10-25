export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email) => {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  if (value.length > 254) return 'Email address is too long.';
  return '';
};

export const validateNewPassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters long.';
  }
  return '';
};

export const validateConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
};
