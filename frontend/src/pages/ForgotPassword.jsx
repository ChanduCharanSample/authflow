import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import FormField from '../components/FormField.jsx';
import api, { getErrorMessage } from '../services/api.js';
import { validateEmail } from '../utils/validation.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setEmail(event.target.value);
    if (error) setError('');
    if (serverError) setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError) return;

    setSubmitting(true);
    setServerError('');

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });
      setMessage(
        response.data.message ||
          'If an account exists for that email, a password reset link has been sent.'
      );
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
          <h1>Forgot your password?</h1>
          <p className="subtitle">
            Enter the email address registered to your account. We will send a
            short-lived, single-use reset link if an account exists.
          </p>
        </header>

        <Alert type="error">{serverError}</Alert>

        {message ? (
          <div className="auth-form">
            <Alert type="success">{message}</Alert>
            <p className="card-note">
              Check your inbox and spam folder. The link expires soon and can
              be used only once.
            </p>
            <Link className="button button-primary button-full" to="/login">
              Back to log in
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <FormField
              id="email"
              label="Registered email address"
              type="email"
              value={email}
              onChange={handleChange}
              error={error}
              autoComplete="email"
              placeholder="you@example.com"
              disabled={submitting}
              autoFocus
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
                  Sending reset link...
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}

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
