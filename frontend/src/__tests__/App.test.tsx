import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock the AuthContext to avoid needing real auth state
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ token: null, login: vi.fn(), logout: vi.fn() }),
}));

// Mock page components to keep tests simple
vi.mock('../pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../pages/RegisterPage', () => ({
  default: () => <div data-testid="register-page">Register Page</div>,
}));

vi.mock('../pages/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../pages/ChangePasswordPage', () => ({
  default: () => <div data-testid="change-password-page">Change Password Page</div>,
}));

describe('App', () => {
  it('renders login page on /login route', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders register page on /register route', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('register-page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users from / to /login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    // Should redirect to login since token is null
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
