import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import DashboardLayout from '../components/shared/layout/DashboardLayout';

const logoutMock = vi.fn();

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: {
      username: 'testuser',
      email: 'test@example.com',
    },
    logout: logoutMock,
  }),
}));

vi.mock('../context/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

function renderLayout({
  showSearch = true,
  searchValue = '',
  onSearchChange = vi.fn(),
}: {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
} = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <DashboardLayout
              activeNav="dashboard"
              showSearch={showSearch}
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder="Search dashboard..."
            >
              <div>Dashboard content</div>
            </DashboardLayout>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * DashboardLayout component tests.
 *
 * Covered scenarios:
 * - layout content rendering
 * - authenticated user initials
 * - search input rendering
 * - search value changes
 * - hidden search state
 * - settings navigation links
 * - logout action
 */
describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Layout content
   *
   * Scenario:
   * DashboardLayout renders with child content.
   *
   * Expected behavior:
   * - The StudyPilot brand is shown
   * - Child content is rendered
   * - The authenticated user's initial is shown
   */
  it('renders layout content and authenticated user information', () => {
    renderLayout();

    expect(screen.getByText('StudyPilot')).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile')).toHaveTextContent('T');
  });

  /**
   * Test case: Search input
   *
   * Scenario:
   * Search is enabled for the layout.
   *
   * Expected behavior:
   * - The search input is rendered
   * - The controlled search value is displayed
   */
  it('renders the search input when search is enabled', () => {
    renderLayout({ searchValue: 'physics' });

    const searchInput = screen.getByPlaceholderText('Search dashboard...');

    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('physics');
  });

  /**
   * Test case: Search input change
   *
   * Scenario:
   * The user types into the search input.
   *
   * Expected behavior:
   * - onSearchChange is called with the new value
   */
  it('calls onSearchChange when typing into the search input', () => {
    const onSearchChange = vi.fn();

    renderLayout({ onSearchChange });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: {
        value: 'tasks',
      },
    });

    expect(onSearchChange).toHaveBeenCalledWith('tasks');
  });

  /**
   * Test case: Hidden search
   *
   * Scenario:
   * Search is disabled for the current page.
   *
   * Expected behavior:
   * - The search input is not visible to the user
   */
  it('renders a readonly search input when search is disabled', () => {
    renderLayout({ showSearch: false });

    const searchInput = screen.getByPlaceholderText('Search dashboard...');

    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('readonly');
    expect(searchInput).toHaveAttribute('tabindex', '-1');
  });

  /**
   * Test case: Settings navigation
   *
   * Scenario:
   * The user can access settings from the layout.
   *
   * Expected behavior:
   * - The settings navigation link points to /settings
   * - The topbar settings button is rendered
   */
  it('renders settings navigation controls', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  /**
   * Test case: Logout
   *
   * Scenario:
   * The user clicks the logout button.
   *
   * Expected behavior:
   * - logout is called once
   */
  it('calls logout when the logout button is clicked', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
