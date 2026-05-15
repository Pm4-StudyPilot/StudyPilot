import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
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
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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
 * - fallback error message is shown for non-error rejections
 * - courses are filtered by the provided search term
 * - no-search-results message is shown when no courses match the search term
 * - created courses are prepended to the list
 * - updated courses replace the matching list item
 * - deleted courses are removed from the list
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

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

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

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Algorithms & Data Structures')).toBeInTheDocument();
      expect(screen.getByText('2 of 2 courses shown')).toBeInTheDocument();
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

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no courses yet/i)).toBeInTheDocument();
      expect(screen.getByText('0 of 0 courses shown')).toBeInTheDocument();
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

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Non-error rejection
   *
   * Scenario:
   * The API request rejects with a non-Error value.
   *
   * Expected behavior:
   * - The fallback error message is displayed
   */
  it('shows fallback error message when the fetch rejects with a non-error value', async () => {
    vi.mocked(api.get).mockRejectedValueOnce('Unexpected failure');

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load courses')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Course search
   *
   * Scenario:
   * A search term is provided to the CourseList component.
   *
   * Expected behavior:
   * - Only courses matching the search term are rendered
   * - Non-matching courses are not rendered
   * - The shown count reflects the filtered result count
   */
  it('filters courses by the provided search term', async () => {
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

    render(
      <MemoryRouter>
        <CourseList searchTerm="machine" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    expect(screen.queryByText('Algorithms & Data Structures')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: No course search results
   *
   * Scenario:
   * A search term is provided that does not match any course name.
   *
   * Expected behavior:
   * - No course cards are rendered
   * - A no-search-results message is displayed
   */
  it('shows no-search-results message when no courses match the search term', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Machine Learning',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <CourseList searchTerm="nonexistent" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No courses match your search.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 1 course shown')).toBeInTheDocument();
  });

  /**
   * Test case: Create course callback
   *
   * Scenario:
   * A course is created successfully through the create course modal.
   *
   * Expected behavior:
   * - The created course is prepended to the course list
   * - The shown count is updated
   */
  it('prepends a newly created course to the list', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Machine Learning',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      },
    ]);

    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'c2',
      name: 'Physics Engines',
      ownerId: 'u1',
      createdAt: '2026-03-27T12:00:00.000Z',
      updatedAt: '2026-03-27T12:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Add course'));
    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Physics Engines' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
      expect(screen.getByText('2 of 2 courses shown')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Update course callback
   *
   * Scenario:
   * A course is updated successfully through the edit course modal.
   *
   * Expected behavior:
   * - The matching course item is replaced with the updated course
   */
  it('updates a course in the list after editing', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Machine Learning',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      },
    ]);

    vi.mocked(api.patch).mockResolvedValueOnce({
      id: 'c1',
      name: 'Advanced Machine Learning',
      ownerId: 'u1',
      createdAt: '2026-03-26T12:00:00.000Z',
      updatedAt: '2026-03-27T12:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/edit course/i));
    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Advanced Machine Learning' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Advanced Machine Learning')).toBeInTheDocument();
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
  });

  /**
   * Test case: Delete course callback
   *
   * Scenario:
   * A course is deleted successfully through the delete course modal.
   *
   * Expected behavior:
   * - The deleted course is removed from the list
   * - The empty state is shown when no courses remain
   */
  it('removes a course from the list after deletion', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Machine Learning',
        ownerId: 'u1',
        createdAt: '2026-03-26T12:00:00.000Z',
        updatedAt: '2026-03-26T12:00:00.000Z',
      },
    ]);

    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/delete course/i));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
      expect(screen.getByText('No courses yet.')).toBeInTheDocument();
    });
  });
});
