import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../pages/SettingsPage';
import { api } from '../services/api';

/**
 * Mock functions for external dependencies.
 *
 * - mockUpdateUser simulates AuthContext profile updates
 * - mockNavigate simulates navigation to the change password page
 */
const mockUpdateUser = vi.fn();
const mockNavigate = vi.fn();

let mockUser: {
  id: string;
  username: string;
  email: string;
  role: string;
} | null = {
  id: '1',
  username: 'testuser',
  email: 'test@students.zhaw.ch',
  role: 'student',
};

/**
 * Mock AuthContext.
 *
 * Replaces the real useAuth hook with a simplified mock version
 * so SettingsPage can be tested with predictable user data.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    updateUser: mockUpdateUser,
  }),
}));

/**
 * Mock react-router-dom navigation while keeping the other real exports.
 *
 * MemoryRouter is still used as the router wrapper in tests,
 * but useNavigate is replaced so navigation can be asserted.
 */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for profile update requests.
 */
vi.mock('../services/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

/**
 * Mock dashboard layout.
 *
 * The shared layout is not the test target here.
 * This keeps the tests focused on SettingsPage behavior.
 */
vi.mock('../components/shared/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * SettingsPage component tests.
 *
 * Covered scenarios:
 * - rendering of the redesigned settings page
 * - prefilled user profile values
 * - empty profile fallback when no user is available
 * - successful profile update
 * - failed profile update
 * - fallback error handling
 * - validation preventing invalid submit
 * - navigation to change password page
 */
describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@students.zhaw.ch',
      role: 'student',
    };
  });

  /**
   * Renders the page inside a MemoryRouter.
   */
  function renderPage() {
    return render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );
  }

  /**
   * Test case: Render settings page.
   *
   * Expected behavior:
   * - page heading is displayed
   * - profile and security sections are visible
   * - profile fields and action buttons are available
   */
  it('renders account settings sections and actions', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        name: /account settings/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /profile information/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /security/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /save profile/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /change password/i,
      })
    ).toBeInTheDocument();
  });

  /**
   * Test case: Prefilled profile values.
   *
   * Expected behavior:
   * - username field is initialized from AuthContext user
   * - email field is initialized from AuthContext user
   */
  it('prefills profile fields with the current user data', () => {
    renderPage();

    expect(screen.getByLabelText(/username/i)).toHaveValue('testuser');
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@students.zhaw.ch');
  });

  /**
   * Test case: Missing user fallback.
   *
   * Expected behavior:
   * - username field falls back to an empty string
   * - email field falls back to an empty string
   */
  it('renders empty profile fields when no user is available', () => {
    mockUser = null;

    renderPage();

    expect(screen.getByLabelText(/username/i)).toHaveValue('');
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
  });

  /**
   * Test case: Successful profile update.
   *
   * Expected behavior:
   * - PATCH /users/me is called with trimmed/lowercased values
   * - AuthContext updateUser is called with returned user data
   * - success message is displayed
   */
  it('updates profile successfully', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      id: '1',
      username: 'updateduser',
      email: 'updated@students.zhaw.ch',
      role: 'student',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: {
        value: ' updateduser ',
      },
    });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: {
        value: 'UPDATED@STUDENTS.ZHAW.CH',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /save profile/i,
      })
    );

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/me', {
        username: 'updateduser',
        email: 'updated@students.zhaw.ch',
      });
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({
      username: 'updateduser',
      email: 'updated@students.zhaw.ch',
    });

    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
  });

  /**
   * Test case: Failed profile update.
   *
   * Expected behavior:
   * - backend error message is displayed
   * - AuthContext updateUser is not called
   */
  it('shows an error message when profile update fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Email already exists'));

    renderPage();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: {
        value: 'testuser',
      },
    });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: {
        value: 'taken@students.zhaw.ch',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /save profile/i,
      })
    );

    expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  /**
   * Test case: Unknown profile update failure.
   *
   * Expected behavior:
   * - fallback error message is displayed
   * - AuthContext updateUser is not called
   */
  it('shows fallback error message when profile update fails with unknown error', async () => {
    vi.mocked(api.patch).mockRejectedValue('Unknown failure');

    renderPage();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: {
        value: 'testuser',
      },
    });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: {
        value: 'test@students.zhaw.ch',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /save profile/i,
      })
    );

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  /**
   * Test case: Validation prevents invalid submit.
   *
   * Expected behavior:
   * - invalid email prevents the API request
   */
  it('does not submit when email is invalid', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: {
        value: 'invalid-email',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /save profile/i,
      })
    );

    await waitFor(() => {
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  /**
   * Test case: Change password navigation.
   *
   * Expected behavior:
   * - clicking the Change Password button navigates to /settings/password
   */
  it('navigates to change password page', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /change password/i,
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith('/settings/password');
  });
});
