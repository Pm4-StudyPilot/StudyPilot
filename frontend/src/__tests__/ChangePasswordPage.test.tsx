import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import { api } from '../services/api';

const mockNavigate = vi.fn();

/**
 * Mock react-router-dom navigation.
 *
 * Keeps all original router functionality while replacing
 * useNavigate with a test spy.
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
 * Only the password update endpoint is required
 * for this test suite.
 */
vi.mock('../services/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

/**
 * Mock dashboard layout.
 *
 * The page layout itself is not part of the test target,
 * therefore the layout wrapper is simplified.
 */
vi.mock('../components/shared/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Renders the page inside a MemoryRouter.
   */
  function renderPage() {
    return render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>
    );
  }

  /**
   * Ensures the page renders all required form elements.
   */
  it('renders the change password form', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        name: /change password/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /change password/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /cancel/i,
      })
    ).toBeInTheDocument();
  });

  /**
   * Ensures validation errors are shown
   * when submitting an empty form.
   */
  it('shows validation errors for empty submit', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: /change password/i,
      })
    );

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
  });

  /**
   * Ensures password match feedback is displayed
   * when both password fields contain the same value.
   */
  it('shows password match feedback', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'StrongPassword123!');

    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'StrongPassword123!');

    expect(screen.getByText(/passwords match/i)).toBeInTheDocument();

    expect(screen.getByText(/ok/i)).toBeInTheDocument();
  });

  /**
   * Ensures the form submits correctly
   * and displays a success message.
   */
  it('submits the form successfully', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      message: 'Password updated successfully',
    });

    renderPage();

    await userEvent.type(screen.getByLabelText(/current password/i), 'OldPassword123!');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'NewPassword123!');

    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword123!');

    await userEvent.click(
      screen.getByRole('button', {
        name: /change password/i,
      })
    );

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
    });

    expect(await screen.findByText(/password updated successfully/i)).toBeInTheDocument();
  });

  /**
   * Ensures API error messages are displayed
   * when the backend request fails.
   */
  it('shows api error message', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Current password is incorrect'));

    renderPage();

    await userEvent.type(screen.getByLabelText(/current password/i), 'WrongPassword');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'NewPassword123!');

    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword123!');

    await userEvent.click(
      screen.getByRole('button', {
        name: /change password/i,
      })
    );

    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });

  /**
   * Ensures the cancel button navigates
   * back to the settings page.
   */
  it('navigates back to settings when cancel is clicked', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: /cancel/i,
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  /**
   * Ensures the submit button becomes disabled
   * while the password update request is pending.
   */
  it('shows loading state during submit', async () => {
    vi.mocked(api.patch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                message: 'Success',
              }),
            100
          )
        )
    );

    renderPage();

    await userEvent.type(screen.getByLabelText(/current password/i), 'OldPassword123!');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'NewPassword123!');

    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword123!');

    await userEvent.click(
      screen.getByRole('button', {
        name: /change password/i,
      })
    );

    expect(
      screen.getByRole('button', {
        name: /change password/i,
      })
    ).toBeDisabled();
  });
});
