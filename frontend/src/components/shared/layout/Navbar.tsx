import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../Logo';

function Avatar({ username, size }: { username: string; size: number }) {
  return (
    <span
      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-semibold flex-shrink-0"
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
              className="btn btn-dark d-flex align-items-center gap-2 px-2 py-1"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              style={{ lineHeight: 1 }}
            >
              <Avatar username={user.username} size={32} />
              <span className="text-white" style={{ fontSize: '0.9rem' }}>
                {user.username}
              </span>
              <i
                className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-secondary`}
                style={{ fontSize: '0.65rem' }}
              />
            </button>

            {/* Menu */}
            <ul
              className={`dropdown-menu dropdown-menu-end shadow-sm mt-1${open ? ' show' : ''}`}
              style={{ minWidth: '220px' }}
            >
              {/* Header */}
              <li className="px-3 pt-3 pb-2 d-flex align-items-center gap-3">
                <Avatar username={user.username} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fw-semibold text-dark text-truncate"
                    style={{ fontSize: '0.9rem', lineHeight: 1.3 }}
                  >
                    {user.username}
                  </div>
                  <div
                    className="text-muted text-truncate"
                    style={{ fontSize: '0.75rem', lineHeight: 1.3 }}
                  >
                    {user.email}
                  </div>
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
                  <i className="fa-solid fa-key fa-fw text-muted" style={{ fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.9rem' }}>Account Settings</span>
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
                  <i
                    className="fa-solid fa-right-from-bracket fa-fw"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Logout</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
