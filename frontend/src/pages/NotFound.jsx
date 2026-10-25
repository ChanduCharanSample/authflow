import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="auth-page">
      <div className="auth-card auth-card-compact">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="subtitle">
          The page you are looking for does not exist or has moved.
        </p>
        <Link className="button button-primary button-full" to="/welcome">
          Go to your welcome page
        </Link>
      </div>
    </section>
  );
}
