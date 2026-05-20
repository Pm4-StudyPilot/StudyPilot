import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { api } from '../services/api';

/**
 * Mock functions for external dependencies.
 *
 * - mockLogin simulates AuthContext login
 * - mockNavigate simulates navigation after successful login
 */
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

/**
 * Mock AuthContext.
 *
 * Replaces the real useAuth hook with a simplified mock version
 * so LoginPage can be tested without real authentication state.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
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
 * for login requests.
 */
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * LoginPage component tests.
 *
 * Covered scenarios:
 * - rendering of the redesigned login page
 * - logout feedback from sessionStorage
 * - validation on empty submit
 * - successful login flow
 * - server-side error display
 * - fallback error handling
 * - auth navigation links
 */
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  /**
   * Renders the page inside a MemoryRouter.
   */
  function renderPage() {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  }

  /**
   * Test case: Render login form.
   *
   * Expected behavior:
   * - page heading is displayed
   * - identifier and password fields are displayed
   * - login button is displayed
   * - auth navigation links are displayed
   */
  it('renders all login fields', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        name: /sign in/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /login/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /need an account/i,
      })
    ).toHaveAttribute('href', '/register');

    expect(
      screen.getByRole('link', {
        name: /forgot your password/i,
      })
    ).toHaveAttribute('href', '/forgot-password');
  });

  /**
   * Test case: Logout feedback.
   *
   * Expected behavior:
   * - message from sessionStorage is displayed
   * - message is removed from sessionStorage after reading
   */
  it('shows logout feedback from session storage', () => {
    sessionStorage.setItem('logoutMessage', 'Successfully logged out');

    renderPage();

    expect(screen.getByText(/successfully logged out/i)).toBeInTheDocument();

    expect(sessionStorage.getItem('logoutMessage')).toBeNull();
  });

  /**
   * Test case: Empty form validation.
   *
   * Expected behavior:
   * - login request is not sent
   * - validation errors prevent submission
   */
  it('does not submit when required fields are empty', async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /login/i,
      })
    );

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  /**
   * Test case: Successful login.
   *
   * Expected behavior:
   * - login endpoint is called with form data
   * - login() is called with returned auth data
   * - navigation to dashboard is triggered
   */
  it('submits login successfully', async () => {
    vi.mocked(api.post).mockResolvedValue({
      token: 'fake-token',
      user: {
        id: '1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        role: 'student',
      },
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: {
        value: 'testuser',
      },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: {
        value: 'Password123!',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /login/i,
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        identifier: 'testuser',
        password: 'Password123!',
      });
    });

    expect(mockLogin).toHaveBeenCalledWith('fake-token', {
      id: '1',
      email: 'test@students.zhaw.ch',
      username: 'testuser',
      role: 'student',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  /**
   * Test case: Failed login.
   *
   * Expected behavior:
   * - backend error message is displayed
   * - login is not called
   * - navigation is not triggered
   */
  it('shows error message when login fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Invalid credentials'));

    renderPage();

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: {
        value: 'wronguser',
      },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: {
        value: 'WrongPassword123!',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /login/i,
      })
    );

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  /**
   * Test case: Unknown login failure.
   *
   * Expected behavior:
   * - fallback error message is displayed
   * - login is not called
   * - navigation is not triggered
   */
  it('shows fallback error message when login fails with unknown error', async () => {
    vi.mocked(api.post).mockRejectedValue('Unknown failure');

    renderPage();

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: {
        value: 'testuser',
      },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: {
        value: 'Password123!',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /login/i,
      })
    );

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
