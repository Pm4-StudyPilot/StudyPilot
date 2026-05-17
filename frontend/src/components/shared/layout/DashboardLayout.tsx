import { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import { useAuth } from '../../../context/useAuth';

/**
 * DashboardLayout
 *
 * Shared application layout used across authenticated dashboard pages.
 *
 * Responsibilities:
 * - Render the sidebar navigation
 * - Render the top navigation bar
 * - Handle logout navigation
 * - Optionally display a reusable topbar search input
 * - Render page-specific content inside the dashboard shell
 *
 * The search bar is controlled externally through props,
 * allowing each page to define its own search behavior.
 */
type DashboardLayoutProps = {
  activeNav: 'dashboard' | 'courses';
  children: ReactNode;
};

/**
 * Returns the CSS classes for a sidebar navigation item.
 *
 * Adds the active modifier class when the navigation item
 * matches the current page.
 */
function navItemClass(isActive: boolean) {
  return `dashboard-nav__item${isActive ? ' dashboard-nav__item--active' : ''}`;
}

/**
 * Renders the shared dashboard shell with sidebar,
 * top navigation, optional search input, and page content.
 */
export default function DashboardLayout({
  activeNav,
  children,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search for courses, notes, or deadlines...',
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const username = user?.username ?? 'A';

  /**
   * Logs out the current user and redirects to the login page.
   *
   * A temporary success message is stored in sessionStorage
   * so it can be displayed after the redirect.
   */
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
              <i className="fa-solid fa-table-cells-large" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/courses"
              className={({ isActive }) => navItemClass(isActive || activeNav === 'courses')}
            >
              <i className="fa-solid fa-book-open" />
              <span>Courses</span>
            </NavLink>
          </nav>
        </div>

        <div className="dashboard-sidebar__footer">
          <button
            type="button"
            className="panel muted hover dashboard-nav__item dashboard-nav__item--logout"
            onClick={handleLogout}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
            <span>Logout</span>
          </button>
          <div className="dashboard-sidebar__username">@{username}</div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          {showSearch && (
            <label className="panel muted active dashboard-search" htmlFor="dashboard-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                id="dashboard-search"
                type="search"
                value={searchValue}
                placeholder={searchPlaceholder}
                onChange={(event) => onSearchChange?.(event.target.value)}
              />
            </label>
          )}

          <div className="dashboard-topbar__actions">
            <button
              type="button"
              className="dashboard-topbar__icon"
              aria-label="Settings"
              onClick={() => navigate('/settings', { state: { from: location.pathname } })}
            >
              <i className="fa-solid fa-gear" />
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
