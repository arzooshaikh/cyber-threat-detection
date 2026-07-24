import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  const linkStyle = (path: string): React.CSSProperties => ({
    marginRight: '1.5rem',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? 'bold' : 'normal',
    color: location.pathname === path ? '#2563eb' : '#333',
  });

  return (
    <nav style={{
      padding: '1rem 2rem',
      borderBottom: '1px solid #ddd',
      display: 'flex',
      alignItems: 'center',
    }}>
      <span style={{ fontWeight: 'bold', marginRight: '2rem' }}>🛡️ CTD System</span>
      <Link to="/" style={linkStyle('/')}>Dashboard</Link>
      <Link to="/bases" style={linkStyle('/bases')}>Bases</Link>
      <Link to="/threats" style={linkStyle('/threats')}>Threats</Link>
      <Link to="/federated" style={linkStyle('/federated')}>Federated Learning</Link>
      <Link to="/run-detection" style={linkStyle('/run-detection')}>Run Detection</Link>
      <Link to="/threat-response" style={linkStyle('/threat-response')}>Threat Response</Link>
    </nav>
  );
}

export default Navbar;