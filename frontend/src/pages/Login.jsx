import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import FormField from '../components/FormField.jsx';
import PasswordField from '../components/PasswordField.jsx';
import api, { getErrorMessage } from '../services/api.js';
import { validateEmail } from '../utils/validation.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const emailError = validateEmail(form.email);
    if (emailError) nextErrors.email = emailError;
    if (!form.password) nextErrors.password = 'Password is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setServerError('');

    try {
      await api.post('/auth/login', {
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/welcome', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <p className="eyebrow">Welcome back</p>
          <h1>Log in to your account</h1>
          <p className="subtitle">
            Enter your details to continue to your secure workspace.
          </p>
        </header>

        {notice ? <Alert type="success">{notice}</Alert> : null}
        <Alert type="error">{serverError}</Alert>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label="Email address"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={submitting}
            autoFocus
          />

          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={submitting}
            labelAccessory={
              <Link to="/forgot-password" className="text-link">
                Forgot password?
              </Link>
            }
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
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        <p className="auth-switch">
          New to AuthFlow?{' '}
          <Link to="/register" className="text-link">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
