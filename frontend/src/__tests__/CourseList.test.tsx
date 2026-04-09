import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CourseList from '../components/courses/CourseList';
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
 * CourseList component tests.
 *
 * Covered scenarios:
 * - loading spinner is shown while fetching
 * - list of courses is rendered after successful fetch
 * - enrolled count reflects the number of courses returned
 * - empty state is shown when no courses are returned
 * - error message is shown when the request fails
 */
describe('CourseList', () => {
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

    render(<CourseList />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /**
   * Test case: Successful fetch with courses
   *
   * Scenario:
   * The API returns a list of courses.
   *
   * Expected behavior:
   * - Each course name is rendered
   * - The enrolled count reflects the number of courses
   */
  it('renders courses after a successful fetch', async () => {
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
        name: 'Algorithms & Data Structures',
        ownerId: 'u1',
        createdAt: '2026-03-25T12:00:00.000Z',
        updatedAt: '2026-03-25T12:00:00.000Z',
      },
    ]);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Algorithms & Data Structures')).toBeInTheDocument();
      expect(screen.getByText('2 courses enrolled')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Empty state
   *
   * Scenario:
   * The API returns an empty array.
   *
   * Expected behavior:
   * - "No courses yet." message is displayed
   * - Enrolled count shows 0
   */
  it('shows the empty state when no courses are returned', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText(/no courses yet/i)).toBeInTheDocument();
      expect(screen.getByText('0 courses enrolled')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Error state
   *
   * Scenario:
   * The API request fails with an error.
   *
   * Expected behavior:
   * - The error message is displayed
   */
  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to load courses'));

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
    });
  });
});
