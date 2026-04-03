import { useAuth } from '../../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../Button';
import Logo from '../Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    sessionStorage.setItem('logoutMessage', 'Successfully logged out');
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <a className="navbar-brand" href="/">
          <Logo />
        </a>
        {user && (
          <div className="d-flex align-items-center">
            <span className="text-light me-3">{user.username}</span>
            <Link to="/settings" className="text-light me-3">
              Account Settings
            </Link>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
