import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import PasswordField from '../components/PasswordField.jsx';
import api, { getErrorMessage } from '../services/api.js';
import {
  validateConfirmation,
  validateNewPassword,
} from '../utils/validation.js';

export default function ResetPassword() {
  const { token } = useParams();
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setServerError('This password reset link is invalid or incomplete.');
      return;
    }

    const nextErrors = {};
    const passwordError = validateNewPassword(form.password);
    if (passwordError) nextErrors.password = passwordError;

    const confirmationError = validateConfirmation(
      form.password,
      form.confirmPassword
    );
    if (confirmationError) nextErrors.confirmPassword = confirmationError;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setServerError('');

    try {
      const response = await api.post(
        `/auth/reset-password/${encodeURIComponent(token)}`,
        {
          password: form.password,
          confirmPassword: form.confirmPassword,
        }
      );
      setMessage(
        response.data.message ||
          'Password reset successfully. Please log in with your new password.'
      );
      setSuccess(true);
      setForm({ password: '', confirmPassword: '' });
    } catch (requestError) {
      setServerError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <p className="eyebrow">Account recovery</p>
          <h1>{token ? 'Choose a new password' : 'Reset link invalid'}</h1>
          <p className="subtitle">
            {token
              ? 'Your reset link is single-use and expires soon.'
              : 'This page needs a valid reset link from your email.'}
          </p>
        </header>

        <Alert type="error">{serverError}</Alert>

        {success ? (
          <div className="auth-form">
            <Alert type="success">{message}</Alert>
            <Link className="button button-primary button-full" to="/login">
              Back to log in
            </Link>
          </div>
        ) : token ? (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <PasswordField
              id="password"
              label="New password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              hint="Use at least 8 characters."
              autoComplete="new-password"
              placeholder="Enter a new password"
              disabled={submitting}
              autoFocus
            />

            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              disabled={submitting}
            />

            <button
              type="submit"
              className="button button-primary button-full"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </button>
          </form>
        ) : (
          <div className="auth-form">
            <Link className="button button-primary button-full" to="/forgot-password">
              Request a new reset link
            </Link>
          </div>
        )}

        {!success && token ? (
          <p className="card-note">
            If this link has expired or was already used, request a new one from
            the{' '}
            <Link className="text-link" to="/forgot-password">
              forgot password page
            </Link>
            .
          </p>
        ) : null}

        <p className="auth-switch">
          Remembered your password?{' '}
          <Link to="/login" className="text-link">
            Back to log in
          </Link>
        </p>
      </div>
    </section>
  );
}
