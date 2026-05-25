import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

import Navbar from '../components/shared/layout/Navbar';

const logoutMock = vi.fn();
const navigateMock = vi.fn();
const toggleThemeMock = vi.fn();

let mockUser: { username: string; email: string } | null = {
  username: 'jdoe',
  email: 'jdoe@example.com',
};
let mockTheme: 'light' | 'dark' = 'dark';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: logoutMock,
  }),
}));

vi.mock('../context/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: toggleThemeMock,
    setTheme: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

/**
 * Navbar component tests (theme toggle + auth dropdown).
 *
 * Covered scenarios:
 * - theme toggle button reflects current theme (icon + a11y attributes)
 * - clicking the toggle calls toggleTheme
 * - dropdown is hidden by default and opens on trigger click
 * - dropdown closes when clicking outside
 * - logout flow: sets session message, calls logout, navigates to /login
 * - settings link target
 * - the user dropdown is not rendered when there is no user
 */
describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUser = { username: 'jdoe', email: 'jdoe@example.com' };
    mockTheme = 'dark';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the theme toggle with dark-mode affordances', () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: /switch to light mode/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('title', 'Switch to light mode');
    expect(toggle.querySelector('i')?.className).toContain('fa-sun');
  });

  it('renders the theme toggle with light-mode affordances when theme is light', () => {
    mockTheme = 'light';
    renderNavbar();

    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle.querySelector('i')?.className).toContain('fa-moon');
  });

  it('calls toggleTheme when the toggle is clicked', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));

    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the user menu closed until the trigger is clicked', () => {
    renderNavbar();

    const menu = document.querySelector('.navbar__menu');
    expect(menu).not.toBeNull();
    expect(menu).not.toHaveClass('show');

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(document.querySelector('.navbar__menu')).toHaveClass('show');
  });

  it('closes the user menu when clicking outside', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(document.querySelector('.navbar__menu')).toHaveClass('show');

    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.navbar__menu')).not.toHaveClass('show');
  });

  it('renders a settings link in the dropdown', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByRole('link', { name: /account settings/i })).toHaveAttribute(
      'href',
      '/settings'
    );
  });

  it('logs out, records the logout message, and navigates to /login', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(sessionStorage.getItem('logoutMessage')).toBe('Successfully logged out');
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('omits the user dropdown when no user is signed in', () => {
    mockUser = null;
    renderNavbar();

    expect(screen.queryByText('jdoe')).not.toBeInTheDocument();
    expect(document.querySelector('.navbar__menu')).toBeNull();
    // Theme toggle is still rendered.
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });
});
