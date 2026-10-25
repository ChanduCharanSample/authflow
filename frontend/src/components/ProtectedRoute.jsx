import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import api from '../services/api';

/**
 * Ask the API who the current cookie belongs to before rendering a protected
 * page. A frontend flag is never treated as proof of authentication.
 */
export default function ProtectedRoute() {
  const [auth, setAuth] = useState({ status: 'checking', user: null });
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    api
      .get('/auth/me', { signal: controller.signal })
      .then((response) => {
        if (active) {
          setAuth({ status: 'authenticated', user: response.data.user });
        }
      })
      .catch((error) => {
        if (active && error.code !== 'ERR_CANCELED') {
          setAuth({ status: 'unauthenticated', user: null });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (auth.status === 'checking') {
    return (
      <div className="page-loading" role="status" aria-live="polite">
        <span className="spinner spinner-large" aria-hidden="true" />
        <span>Checking your session...</span>
      </div>
    );
  }

  if (auth.status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, notice: 'Please log in to continue.' }}
      />
    );
  }

  return <Outlet context={{ user: auth.user }} />;
}
