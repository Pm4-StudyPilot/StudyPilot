import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import { api } from '../services/api';

/**
 * Mock functions for external dependencies.
 *
 * - mockNavigate simulates navigation (cancel button)
 */
const mockNavigate = vi.fn();

/**
 * Mock AuthContext.
 *
 * The page uses Navbar which reads from AuthContext.
 */
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'testuser', email: 'test@students.zhaw.ch', role: 'USER' },
    logout: vi.fn(),
  }),
}));

/**
 * Mock react-router-dom navigation while keeping real exports.
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
 * Prevents real HTTP requests and allows controlled PATCH responses.
 */
vi.mock('../services/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

/**
 * ChangePasswordPage component tests.
 *
 * Covered scenarios:
 * - rendering of all required fields
 * - successful password change
 * - server-side error display on failure (wrong current password)
 * - client-side validation prevents empty submission
 * - client-side validation catches mismatched new passwords
 * - client-side validation catches weak new password
 * - cancel button navigates back to home
 */
describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Render all form fields
   *
   * Scenario:
   * The change password page is opened.
   *
   * Expected behavior:
   * - Current password field is displayed
   * - New password field is displayed
   * - Confirm new password field is displayed
   * - Submit button is displayed
   * - Cancel button is displayed
   */
  it('renders all password change fields', () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  /**
   * Test case: Successful password change
   *
   * Scenario:
   * User fills in all fields correctly and the backend returns a success message.
   *
   * Expected behavior:
   * - api.patch() is called with currentPassword and newPassword
   * - Success message is displayed
   */
  it('submits successfully and shows success message', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({
      message: 'Password changed successfully',
    });

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass@123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'NewPass@123456!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass@123456!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'CurrentPass@123!',
        newPassword: 'NewPass@123456!',
      });

      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Incorrect current password
   *
   * Scenario:
   * The backend rejects the request because the current password is wrong.
   *
   * Expected behavior:
   * - API request is made
   * - Error message is displayed
   */
  it('shows error message when current password is incorrect', async () => {
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('Current password is incorrect'));

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'WrongPass@123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'NewPass@123456!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass@123456!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Empty form submission
   *
   * Scenario:
   * The submit button is clicked without entering any values.
   *
   * Expected behavior:
   * - Client-side validation blocks submission
   * - Validation error for current password is shown
   * - API is not called
   */
  it('should not submit if required fields are empty', async () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
    });

    expect(api.patch).not.toHaveBeenCalled();
  });

  /**
   * Test case: Mismatched new passwords
   *
   * Scenario:
   * New password and confirm new password do not match.
   *
   * Expected behavior:
   * - Client-side validation blocks submission
   * - "Passwords do not match" error is shown
   * - API is not called
   */
  it('should show validation error when new passwords do not match', async () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass@123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'NewPass@123456!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'DifferentPass@123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(api.patch).not.toHaveBeenCalled();
  });

  /**
   * Test case: Weak new password
   *
   * Scenario:
   * New password does not meet security requirements.
   *
   * Expected behavior:
   * - Client-side validation blocks submission
   * - Appropriate validation error is shown
   * - API is not called
   */
  it('should show validation error for weak new password', async () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass@123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'weak' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'weak' },
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    });

    expect(api.patch).not.toHaveBeenCalled();
  });

  /**
   * Test case: Cancel button navigation
   *
   * Scenario:
   * User clicks the Cancel button.
   *
   * Expected behavior:
   * - Navigate to "/" is called
   */
  it('navigates to home when cancel is clicked', () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
