import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import FormField from '../components/FormField.jsx';
import PasswordField from '../components/PasswordField.jsx';
import api, { getErrorMessage } from '../services/api.js';
import {
  validateConfirmation,
  validateEmail,
  validateNewPassword,
} from '../utils/validation.js';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    const name = form.name.trim();

    if (!name) nextErrors.name = 'Name is required.';
    else if (name.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters long.';
    } else if (name.length > 80) {
      nextErrors.name = 'Name must be at most 80 characters long.';
    }

    const emailError = validateEmail(form.email);
    if (emailError) nextErrors.email = emailError;

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
      await api.post('/auth/register', {
        name,
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/login', {
        replace: true,
        state: {
          notice: 'Account created successfully. Please log in to continue.',
        },
      });
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
          <p className="eyebrow">Get started</p>
          <h1>Create your account</h1>
          <p className="subtitle">
            A few details and you will be on your way in.
          </p>
        </header>

        <Alert type="error">{serverError}</Alert>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField
            id="name"
            label="Full name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            autoComplete="name"
            placeholder="Demo User"
            disabled={submitting}
            autoFocus
          />

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
          />

          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            hint="Use at least 8 characters."
            autoComplete="new-password"
            placeholder="Create a password"
            disabled={submitting}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            autoComplete="new-password"
            placeholder="Repeat your password"
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
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="text-link">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}
