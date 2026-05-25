import { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import { useAuth } from '../../../context/useAuth';
import { useTheme } from '../../../context/useTheme';

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
  activeNav?: 'dashboard' | 'courses' | 'settings' | false;
  children: ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (event: string) => void;
  searchPlaceholder?: string;
};

/**
 * Returns the CSS classes for a sidebar navigation item.
 *
 * Adds the active modifier class when the navigation item
 * matches the current page.
 */
function navItemClass(isActive: boolean) {
  return `panel hover muted dashboard-nav__item${isActive ? ' active' : ''}`;
}

/**
 * Renders the shared dashboard shell with sidebar,
 * top navigation, optional search input, and page content.
 */
export default function DashboardLayout({
  children,
  activeNav = false,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search for courses, notes, or deadlines...',
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const username = user?.username ?? 'A';
  const nextThemeLabel = theme === 'dark' ? 'light' : 'dark';

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
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `${navItemClass(isActive || activeNav === 'settings')} dashboard-nav__settings`
              }
            >
              <i className="fa-solid fa-gear" />
              <span>Settings</span>
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
        <header className={`dashboard-topbar${!showSearch ? ' dashboard-topbar--no-search' : ''}`}>
          <label
            className={`panel muted active dashboard-search${
              !showSearch ? ' dashboard-search--placeholder' : ''
            }`}
            htmlFor="dashboard-search"
            aria-hidden={!showSearch}
          >
            <i className="fa-solid fa-magnifying-glass" />

            <input
              id="dashboard-search"
              type="search"
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={(event) => onSearchChange?.(event.target.value)}
              tabIndex={showSearch ? 0 : -1}
              readOnly={!showSearch}
            />
          </label>
          <div className="dashboard-search dashboard-search--placeholder" aria-hidden="true" />

          <div className="dashboard-topbar__actions">
            <button
              type="button"
              className="dashboard-topbar__icon dashboard-topbar__theme-toggle"
              aria-label={`Switch to ${nextThemeLabel} mode`}
              aria-pressed={theme === 'light'}
              title={`Switch to ${nextThemeLabel} mode`}
              onClick={toggleTheme}
            >
              <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
            <button
              type="button"
              className="dashboard-topbar__icon dashboard-topbar__settings"
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
