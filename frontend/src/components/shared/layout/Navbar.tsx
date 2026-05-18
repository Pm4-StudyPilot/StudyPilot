import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../Logo';

function Avatar({ username, size }: { username: string; size: number }) {
  return (
    <span
      className="navbar__avatar rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {username.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    setOpen(false);
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
          <div className="dropdown" ref={dropdownRef}>
            {/* Trigger */}
            <button
              className="navbar__trigger btn btn-dark d-flex align-items-center gap-2 px-2 py-1"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <Avatar username={user.username} size={32} />
              <span className="navbar__username text-white">{user.username}</span>
              <i
                className={`navbar__chevron fa-solid fa-chevron-${open ? 'up' : 'down'} text-secondary`}
              />
            </button>

            {/* Menu */}
            <ul
              className={`navbar__menu dropdown-menu dropdown-menu-end shadow-sm mt-1${open ? ' show' : ''}`}
            >
              {/* Header */}
              <li className="px-3 pt-3 pb-2 d-flex align-items-center gap-3">
                <Avatar username={user.username} size={40} />
                <div className="navbar__meta">
                  <div className="navbar__meta-name fw-semibold text-dark text-truncate">
                    {user.username}
                  </div>
                  <div className="navbar__meta-email text-muted text-truncate">{user.email}</div>
                </div>
              </li>

              <li>
                <hr className="dropdown-divider my-1" />
              </li>

              <li>
                <Link
                  to="/settings"
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={() => setOpen(false)}
                >
                  <i className="navbar__item-icon fa-solid fa-key fa-fw text-muted" />
                  <span className="navbar__item-label">Account Settings</span>
                </Link>
              </li>

              <li>
                <hr className="dropdown-divider my-1" />
              </li>

              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                  onClick={handleLogout}
                >
                  <i className="navbar__item-icon fa-solid fa-right-from-bracket fa-fw" />
                  <span className="navbar__item-label">Logout</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
