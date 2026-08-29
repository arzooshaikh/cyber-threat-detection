import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconShield, IconLogOut } from './Icons';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  if (location.pathname === '/login') return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = (path: string) =>
    `navbar-link${location.pathname === path ? ' active' : ''}`;

  return (
    <nav className="navbar">
      <span className="navbar-brand">
        <IconShield style={{ width: 18, height: 18, color: 'var(--accent)' }} />
        CTD Console
      </span>
      <div className="navbar-links">
        <Link to="/" className={linkClass('/')}>Dashboard</Link>
        <Link to="/bases" className={linkClass('/bases')}>Bases</Link>
        <Link to="/threats" className={linkClass('/threats')}>Threats</Link>
        <Link to="/federated" className={linkClass('/federated')}>Federated Learning</Link>
        <Link to="/run-detection" className={linkClass('/run-detection')}>Run Detection</Link>
        <Link to="/threat-response" className={linkClass('/threat-response')}>Threat Response</Link>
      </div>
      {isAuthenticated && (
        <div className="navbar-spacer">
          <button className="btn-logout" onClick={handleLogout}>
            <IconLogOut style={{ width: 14, height: 14, marginRight: 4, verticalAlign: '-2px' }} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
