import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for course listing requests.
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

/**
 * Mock AuthContext.
 *
 * HomePage uses Navbar which depends on useAuth.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

/**
 * HomePage component tests.
 *
 * Covered scenarios:
 * - course search bar is rendered
 * - search input filters the rendered course list
 */
describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Search bar rendering
   *
   * Scenario:
   * The HomePage is rendered.
   *
   * Expected behavior:
   * - The course search input is visible
   */
  it('renders the course search bar', () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument();
  });

  /**
   * Test case: Course search integration
   *
   * Scenario:
   * The user enters a search term in the HomePage search bar.
   *
   * Expected behavior:
   * - The search term is passed to CourseList
   * - Only matching courses are rendered
   */
  it('filters courses through the search bar', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Machine Learning',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      },
      {
        id: 'c2',
        name: 'Physics Engines',
        ownerId: 'u1',
        createdAt: '2026-03-25T12:00:00.000Z',
        updatedAt: '2026-03-25T12:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: 'physics' },
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });
});
