import { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../Logo';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { isAiInputVisible } from '../aiInputVisibility';
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
  activeNav?: 'dashboard' | 'courses' | 'resources' | 'settings' | false;
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
  searchPlaceholder,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const username = user?.username ?? 'A';
  const nextThemeLabel = theme === 'dark' ? 'light' : 'dark';
  const effectivePlaceholder = searchPlaceholder ?? t('common.search.default');
  const hasAiInput = isAiInputVisible(location.pathname);

  /**
   * Logs out the current user and redirects to the login page.
   *
   * A temporary success message is stored in sessionStorage
   * so it can be displayed after the redirect.
   */
  function handleLogout() {
    sessionStorage.setItem('logoutMessage', t('common.logoutSuccess'));
    logout();
    navigate('/login');
  }

  return (
    <div className={`dashboard-shell${hasAiInput ? ' dashboard-shell--with-ai-input' : ''}`}>
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
              <span>{t('common.nav.dashboard')}</span>
            </NavLink>

            <NavLink
              to="/courses"
              className={({ isActive }) => navItemClass(isActive || activeNav === 'courses')}
            >
              <i className="fa-solid fa-book-open" />
              <span>{t('common.nav.courses')}</span>
            </NavLink>

            <NavLink
              to="/resources"
              className={({ isActive }) => navItemClass(isActive || activeNav === 'resources')}
            >
              <i className="fa-solid fa-folder-open" />
              <span>{t('common.nav.resources')}</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `${navItemClass(isActive || activeNav === 'settings')} dashboard-nav__settings`
              }
            >
              <i className="fa-solid fa-gear" />
              <span>{t('common.nav.settings')}</span>
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
            <span>{t('common.nav.logout')}</span>
          </button>

          <div className="dashboard-sidebar__user">
            <div className="dashboard-avatar" aria-label={t('common.nav.profileAriaLabel')}>
              {username.slice(0, 1).toUpperCase()}
            </div>
            <div className="dashboard-sidebar__username">@{username}</div>
          </div>
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
              placeholder={effectivePlaceholder}
              onChange={(event) => onSearchChange?.(event.target.value)}
              tabIndex={showSearch ? 0 : -1}
              readOnly={!showSearch}
            />
          </label>
          <div className="dashboard-search dashboard-search--placeholder" aria-hidden="true" />

          <div className="dashboard-topbar__actions">
            <LanguageSwitcher />
            {user && <NotificationBell />}
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
              aria-label={t('common.nav.settingsAriaLabel')}
              onClick={() => navigate('/settings', { state: { from: location.pathname } })}
            >
              <i className="fa-solid fa-gear" />
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
