import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function renderPage(initialEntries = ['/reset-password?token=abc123']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the new password form when a token is present', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows the invalid link state when no token is supplied', () => {
    renderPage(['/reset-password']);

    expect(screen.getByText(/invalid or missing reset link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new link/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('submits the new password and renders the success state', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Password reset!' });

    renderPage();

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'StrongP@ssword1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'StrongP@ssword1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'abc123',
        newPassword: 'StrongP@ssword1',
      });
    });

    expect(await screen.findByText(/password reset!/i)).toBeInTheDocument();
  });

  it('surfaces an API error message when the request fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Token expired'));

    renderPage();

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'StrongP@ssword1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'StrongP@ssword1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/token expired/i)).toBeInTheDocument();
  });
});
