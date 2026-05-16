import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import { useAuth } from '../../../context/useAuth';
import {
  faArrowRightFromBracket,
  faBookOpen,
  faGear,
  faMagnifyingGlass,
  faTableCellsLarge,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type DashboardLayoutProps = {
  activeNav: 'dashboard' | 'courses';
  children: ReactNode;
};

function navItemClass(isActive: boolean) {
  return `dashboard-nav__item${isActive ? ' dashboard-nav__item--active' : ''}`;
}

export default function DashboardLayout({ activeNav, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const username = user?.username ?? 'A';

  function handleLogout() {
    sessionStorage.setItem('logoutMessage', 'Successfully logged out');
    logout();
    navigate('/login');
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-brand">
            <Logo className="dashboard-brand__logo" />
            <div className="dashboard-brand__meta">Term unavailable from backend</div>
          </div>

          <nav className="dashboard-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) => navItemClass(isActive || activeNav === 'dashboard')}
            >
              <FontAwesomeIcon icon={faTableCellsLarge} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/courses"
              className={({ isActive }) => navItemClass(isActive || activeNav === 'courses')}
            >
              <FontAwesomeIcon icon={faBookOpen} />
              <span>Courses</span>
            </NavLink>
          </nav>
        </div>

        <div className="dashboard-sidebar__footer">
          <button
            type="button"
            className="dashboard-nav__item dashboard-nav__item--logout"
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} />
            <span>Logout</span>
          </button>
          <div className="dashboard-sidebar__username">@{username}</div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <label className="dashboard-search" htmlFor="dashboard-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              id="dashboard-search"
              type="search"
              placeholder="Search for courses, notes, or deadlines..."
            />
          </label>

          <div className="dashboard-topbar__actions">
            <button
              type="button"
              className="dashboard-topbar__icon"
              aria-label="Settings"
              onClick={() => navigate('/settings', { state: { from: location.pathname } })}
            >
              <FontAwesomeIcon icon={faGear} />
            </button>
            <div className="dashboard-topbar__divider" />
            <div className="dashboard-avatar" aria-label="Profile">
              {username.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
