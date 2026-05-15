import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
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
 * - formatted course creation date is rendered
 * - error message is shown when the request fails
 * - fallback error message is shown for non-error rejections
 * - not found message is shown when course is null
 * - documents tab is rendered by default
 * - tasks tab can show an empty state
 * - tasks can be filtered by title in the tasks tab
 * - no-search-results message is shown when no tasks match the search term
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
   * - The formatted creation date is rendered
   */
  it('renders the course name and creation date after a successful fetch', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'Machine Learning Fundamentals',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Added March 26, 2026')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Documents tab default
   *
   * Scenario:
   * The course details load successfully.
   *
   * Expected behavior:
   * - The Documents tab is active by default
   * - The document upload section is rendered
   */
  it('renders the documents tab by default', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'Machine Learning Fundamentals',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Upload document')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Error state
   *
   * Scenario:
   * The API request fails with an Error.
   *
   * Expected behavior:
   * - The error message is displayed
   */
  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to load course'));

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText(/failed to load course/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Non-error rejection
   *
   * Scenario:
   * The course request rejects with a non-Error value.
   *
   * Expected behavior:
   * - The fallback error message is displayed
   */
  it('shows fallback error message when the course fetch rejects with a non-error value', async () => {
    vi.mocked(api.get).mockRejectedValueOnce('Unexpected failure');

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Failed to load course')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Not found state
   *
   * Scenario:
   * The API returns null for the requested course.
   *
   * Expected behavior:
   * - The not found message is displayed
   */
  it('shows not found message when course is null', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Course not found.')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Empty tasks state
   *
   * Scenario:
   * The user opens the Tasks tab and the course has no tasks.
   *
   * Expected behavior:
   * - The empty tasks message is displayed
   */
  it('shows empty state in the tasks tab when no tasks exist', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'Machine Learning Fundamentals',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /tasks/i }));

    expect(screen.getAllByText('No tasks yet. Add one to get started.')).toHaveLength(2);
  });

  /**
   * Test case: Task search
   *
   * Scenario:
   * The user opens the Tasks tab and enters a search term.
   *
   * Expected behavior:
   * - Only tasks matching the search term are rendered
   * - Non-matching tasks are not rendered
   */
  it('filters tasks by title in the tasks tab', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'Machine Learning Fundamentals',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      })
      .mockResolvedValueOnce([
        {
          id: 't1',
          title: 'Read chapter 1',
          description: null,
          status: 'OPEN',
          priority: 'MEDIUM',
          dueDate: null,
          position: 0,
          courseId: 'c1',
          createdAt: '2026-03-26T12:00:00.000Z',
          updatedAt: '2026-03-26T12:00:00.000Z',
        },
        {
          id: 't2',
          title: 'Submit assignment',
          description: null,
          status: 'OPEN',
          priority: 'HIGH',
          dueDate: null,
          position: 1,
          courseId: 'c1',
          createdAt: '2026-03-26T12:00:00.000Z',
          updatedAt: '2026-03-26T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([]);

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /tasks/i }));

    await waitFor(() => {
      expect(screen.getByText('Read chapter 1')).toBeInTheDocument();
      expect(screen.getByText('Submit assignment')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'submit' },
    });

    expect(screen.queryByText('Read chapter 1')).not.toBeInTheDocument();
    expect(screen.getByText('Submit assignment')).toBeInTheDocument();
  });

  /**
   * Test case: No task search results
   *
   * Scenario:
   * The user enters a search term that does not match any task title.
   *
   * Expected behavior:
   * - No task rows are rendered
   * - A no-search-results message is displayed
   */
  it('shows no-search-results message when no tasks match the search term', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'Machine Learning Fundamentals',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      })
      .mockResolvedValueOnce([
        {
          id: 't1',
          title: 'Read chapter 1',
          description: null,
          status: 'OPEN',
          priority: 'MEDIUM',
          dueDate: null,
          position: 0,
          courseId: 'c1',
          createdAt: '2026-03-26T12:00:00.000Z',
          updatedAt: '2026-03-26T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([]);

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /tasks/i }));

    await waitFor(() => {
      expect(screen.getByText('Read chapter 1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'nonexistent' },
    });

    expect(screen.queryByText('Read chapter 1')).not.toBeInTheDocument();
    expect(screen.getByText('No tasks match your search.')).toBeInTheDocument();
  });
});
