import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import api, { getErrorMessage } from '../services/api.js';

export default function Welcome() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setLoggingOut(true);
    setError('');

    try {
      await api.post('/auth/logout');
      navigate('/login', {
        replace: true,
        state: { notice: 'You have been logged out.' },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setLoggingOut(false);
    }
  };

  return (
    <section className="welcome-page">
      <div className="welcome-card">
        <h1>Welcome, {user?.name}!</h1>
        <p className="subtitle">
          You are signed in as <strong>{user?.email}</strong>.
        </p>

        <Alert type="error">{error}</Alert>

        <button
          type="button"
          className="button button-primary button-full"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-busy={loggingOut}
        >
          {loggingOut ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Logging out...
            </>
          ) : (
            'Log out'
          )}
        </button>
      </div>
    </section>
  );
}
