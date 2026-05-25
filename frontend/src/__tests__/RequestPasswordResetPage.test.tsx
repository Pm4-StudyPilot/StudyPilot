import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RequestPasswordResetPage from '../pages/RequestPasswordResetPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RequestPasswordResetPage />
    </MemoryRouter>
  );
}

describe('RequestPasswordResetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the email form and back-to-login link', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a success message after the API responds', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Check your inbox' });

    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/request-password-reset', {
        email: 'user@example.com',
      });
    });

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });

  it('shows the API error when the request fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('User not found'));

    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'unknown@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
  });
});
