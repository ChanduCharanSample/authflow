import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="site-header">
      <nav className="navbar container" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="AuthFlow home">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>AuthFlow</span>
        </Link>

        <div className="nav-links">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `nav-link${isActive ? ' is-active' : ''}`
            }
          >
            Log in
          </NavLink>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              `button button-small button-primary${isActive ? ' is-active' : ''}`
            }
          >
            Create account
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
