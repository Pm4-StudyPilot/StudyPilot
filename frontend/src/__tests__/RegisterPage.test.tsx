import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';
import { api } from '../services/api';

/**
 * Mock functions for external dependencies.
 *
 * - mockLogin simulates AuthContext login
 * - mockNavigate simulates navigation after successful registration
 */
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

/**
 * Mock AuthContext.
 *
 * Replaces the real useAuth hook with a simplified mock version
 * so RegisterPage can be tested without real authentication state.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

/**
 * Mock react-router-dom navigation while keeping the other real exports.
 *
 * MemoryRouter is still used as normal router wrapper in tests,
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
 * for availability checks and registration requests.
 */
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * RegisterPage component tests.
 *
 * Covered scenarios:
 * - rendering of the redesigned registration page
 * - password requirement feedback
 * - password match feedback
 * - username availability feedback
 * - email availability feedback
 * - successful registration flow
 * - server-side error display
 */
describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Renders the page inside a MemoryRouter.
   */
  function renderPage() {
    return render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
  }

  /**
   * Provides a reusable API mock that responds to both
   * availability checks and registration requests.
   */
  function mockSuccessfulApiResponses() {
    vi.mocked(api.post).mockImplementation(async (url, body) => {
      if (
        url === '/auth/check-availability' &&
        body &&
        typeof body === 'object' &&
        'email' in body
      ) {
        return {
          emailExists: false,
        };
      }

      if (
        url === '/auth/check-availability' &&
        body &&
        typeof body === 'object' &&
        'username' in body
      ) {
        return {
          usernameExists: false,
        };
      }

      if (url === '/auth/register') {
        return {
          token: 'fake-token',
          user: {
            id: '1',
            email: 'test@students.zhaw.ch',
            username: 'testuser',
            role: 'student',
          },
        };
      }

      return {};
    });
  }

  /**
   * Test case: Render registration form.
   *
   * Expected behavior:
   * - page heading is displayed
   * - all form fields are displayed
   * - register button is displayed
   * - login link is displayed
   */
  it('renders all registration fields', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        name: /create account/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /register/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /already have an account/i,
      })
    ).toHaveAttribute('href', '/login');
  });

  /**
   * Test case: Password requirement feedback.
   *
   * Expected behavior:
   * - password rules are visible while typing
   * - the rules reflect the keys returned by getPasswordChecks
   */
  it('shows password requirement feedback while typing', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: {
        value: 'Password123!@',
      },
    });

    expect(screen.getByText(/minLength/i)).toBeInTheDocument();
    expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    expect(screen.getByText(/lowercase/i)).toBeInTheDocument();
    expect(screen.getByText(/number/i)).toBeInTheDocument();
    expect(screen.getByText(/specialChar/i)).toBeInTheDocument();
  });

  /**
   * Test case: Password confirmation feedback.
   *
   * Expected behavior:
   * - matching passwords show a positive feedback message
   * - non-matching passwords show a negative feedback message
   */
  it('shows password match feedback', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: {
        value: 'Password123!@',
      },
    });

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: {
        value: 'Password123!@',
      },
    });

    expect(screen.getByText(/passwords match/i)).toBeInTheDocument();
  });

  /**
   * Test case: Username availability feedback.
   *
   * Expected behavior:
   * - availability endpoint is called after typing
   * - available username feedback is displayed
   */
  it('shows username availability feedback', async () => {
    vi.mocked(api.post).mockResolvedValue({
      usernameExists: false,
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: {
        value: 'testuser',
      },
    });

    expect(await screen.findByText(/username available/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/check-availability', {
        username: 'testuser',
      });
    });
  });

  /**
   * Test case: Email availability feedback.
   *
   * Expected behavior:
   * - availability endpoint is called after typing
   * - available email feedback is displayed
   */
  it('shows email availability feedback', async () => {
    vi.mocked(api.post).mockResolvedValue({
      emailExists: false,
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: {
        value: 'test@students.zhaw.ch',
      },
    });

    expect(await screen.findByText(/e-mail available/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/check-availability', {
        email: 'test@students.zhaw.ch',
      });
    });
  });

  /**
   * Test case: Successful registration.
   *
   * Expected behavior:
   * - register endpoint is called with form data
   * - login() is called with returned auth data
   * - navigation to dashboard is triggered
   */
  it('submits registration successfully', async () => {
    mockSuccessfulApiResponses();

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

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: {
        value: 'Password123!@',
      },
    });

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: {
        value: 'Password123!@',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /register/i,
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'testuser',
        email: 'test@students.zhaw.ch',
        password: 'Password123!@',
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
   * Test case: Failed registration.
   *
   * Expected behavior:
   * - backend error message is displayed
   * - login is not called
   * - navigation is not triggered
   */
  it('shows server error when registration fails', async () => {
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url === '/auth/register') {
        throw new Error('Registration failed');
      }

      return {};
    });

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

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: {
        value: 'Password123!@',
      },
    });

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: {
        value: 'Password123!@',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /register/i,
      })
    );

    expect(await screen.findByText(/registration failed/i)).toBeInTheDocument();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
