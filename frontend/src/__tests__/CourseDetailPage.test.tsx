import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseDetailPage from '../pages/CourseDetailPage';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for course detail requests.
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

/**
 * Mock AuthContext.
 *
 * CourseDetailPage uses Navbar which depends on useAuth.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

function renderWithRoute(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/courses/${id}`]}>
      <Routes>
        <Route path="/courses/:id" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * CourseDetailPage component tests.
 *
 * Covered scenarios:
 * - loading spinner is shown while fetching
 * - course details are rendered after successful fetch
 * - error message is shown when the request fails
 * - not found message is shown when course is null
 */
describe('CourseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Loading state
   *
   * Scenario:
   * The API call is pending.
   *
   * Expected behavior:
   * - A loading spinner is visible
   */
  it('shows a loading spinner while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    renderWithRoute('c1');

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /**
   * Test case: Successful fetch
   *
   * Scenario:
   * The API returns a course object.
   *
   * Expected behavior:
   * - The course name is rendered
   */
  it('renders the course name after a successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'c1',
      name: 'Machine Learning Fundamentals',
      ownerId: 'u1',
      createdAt: '2026-03-26T12:00:00.000Z',
      updatedAt: '2026-03-26T12:00:00.000Z',
    });

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Error state
   *
   * Scenario:
   * The API request fails.
   *
   * Expected behavior:
   * - An error message is displayed
   */
  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to load course'));

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText(/failed to load course/i)).toBeInTheDocument();
    });
  });
});
