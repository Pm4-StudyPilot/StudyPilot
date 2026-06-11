import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import CourseList from '../components/courses/CourseList';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for course list and searchable course content requests.
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      email: 'owner@example.com',
      username: 'owner',
      role: 'USER',
    },
    token: 'token',
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

const courseFixtures = [
  {
    id: 'c1',
    name: 'Machine Learning',
    color: '#6C63FF',
    ownerId: 'u1',
    createdAt: '2026-03-26T12:00:00.000Z',
    updatedAt: '2026-03-26T12:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Physics Engines',
    color: '#4DA3FF',
    ownerId: 'u1',
    createdAt: '2026-03-25T12:00:00.000Z',
    updatedAt: '2026-03-25T12:00:00.000Z',
  },
];

/**
 * Mocks all API calls used by CourseList.
 */
function mockCourseListApi(courses = courseFixtures) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/courses') {
      return Promise.resolve(courses);
    }

    if (url === '/courses/c1/tasks') {
      return Promise.resolve([
        {
          id: 't1',
          title: 'Train model',
          description: null,
          status: 'OPEN',
          priority: 'MEDIUM',
          dueDate: null,
          position: 0,
          courseId: 'c1',
          createdAt: '2026-03-26T12:00:00.000Z',
          updatedAt: '2026-03-26T12:00:00.000Z',
        },
      ]);
    }

    if (url === '/courses/c2/tasks') {
      return Promise.resolve([
        {
          id: 't2',
          title: 'Collision analysis',
          description: null,
          status: 'OPEN',
          priority: 'HIGH',
          dueDate: null,
          position: 0,
          courseId: 'c2',
          createdAt: '2026-03-25T12:00:00.000Z',
          updatedAt: '2026-03-25T12:00:00.000Z',
        },
      ]);
    }

    if (url.startsWith('/documents/course/c1')) {
      return Promise.resolve([
        {
          id: 'd1',
          filename: 'ML Notes.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          createdAt: '2026-03-26T12:00:00.000Z',
        },
      ]);
    }

    if (url.startsWith('/documents/course/c2')) {
      return Promise.resolve([
        {
          id: 'd2',
          filename: 'Agile Estimating and Planning.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          createdAt: '2026-03-25T12:00:00.000Z',
        },
      ]);
    }

    if (url === '/courses/c1/quizzes') {
      return Promise.resolve([
        {
          id: 'q1',
          title: 'Neural Networks Quiz',
          description: null,
          isOrderRandom: false,
          courseId: 'c1',
          createdAt: '2026-03-26T12:00:00.000Z',
          updatedAt: '2026-03-26T12:00:00.000Z',
        },
      ]);
    }

    if (url === '/courses/c2/quizzes') {
      return Promise.resolve([
        {
          id: 'q2',
          title: 'Energy Conservation Quiz',
          description: null,
          isOrderRandom: false,
          courseId: 'c2',
          createdAt: '2026-03-25T12:00:00.000Z',
          updatedAt: '2026-03-25T12:00:00.000Z',
        },
      ]);
    }

    return Promise.resolve([]);
  });
}

/**
 * CourseList component tests.
 *
 * Covered scenarios:
 * - loading spinner is shown while fetching
 * - courses are rendered after successful fetch
 * - empty state is shown when no courses exist
 * - error state is shown when fetching fails
 * - fallback error message is shown for non-error rejections
 * - courses are filtered by course name, task title, document filename, or quiz title
 * - no-search-results message is shown when no content matches the search term
 * - newly created courses are prepended to the list
 * - updated courses are replaced in the list
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
   * The course API request is pending.
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
   * Test case: Successful fetch
   *
   * Scenario:
   * The API returns courses.
   *
   * Expected behavior:
   * - Returned courses are rendered
   * - The shown count reflects the number of courses returned
   */
  it('renders courses after a successful fetch', async () => {
    mockCourseListApi();

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    });

    expect(screen.getByText('2 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Empty state
   *
   * Scenario:
   * The API returns an empty course list.
   *
   * Expected behavior:
   * - The empty state is displayed
   */
  it('shows the empty state when no courses are returned', async () => {
    mockCourseListApi([]);

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No courses yet.')).toBeInTheDocument();
    });

    expect(screen.getByText('0 of 0 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Error state
   *
   * Scenario:
   * The course API request fails with an Error.
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
      expect(screen.getByText('Failed to load courses')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Non-error rejection
   *
   * Scenario:
   * The course API request rejects with a non-Error value.
   *
   * Expected behavior:
   * - A fallback error message is displayed
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
   * Test case: Search by course name
   *
   * Scenario:
   * A search term matches a course name.
   *
   * Expected behavior:
   * - Only the matching course is rendered
   */
  it('filters courses by course name', async () => {
    mockCourseListApi();

    render(
      <MemoryRouter>
        <CourseList searchTerm="machine" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    expect(screen.queryByText('Physics Engines')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Search by task title
   *
   * Scenario:
   * A search term matches a task title belonging to a course.
   *
   * Expected behavior:
   * - The related course is rendered
   */
  it('filters courses by task title', async () => {
    mockCourseListApi();

    render(
      <MemoryRouter>
        <CourseList searchTerm="collision" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Search by document filename
   *
   * Scenario:
   * A search term matches a document filename belonging to a course.
   *
   * Expected behavior:
   * - The related course is rendered
   */
  it('filters courses by document filename', async () => {
    mockCourseListApi();

    render(
      <MemoryRouter>
        <CourseList searchTerm="agile" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Search by quiz title
   *
   * Scenario:
   * A search term matches a quiz title belonging to a course.
   *
   * Expected behavior:
   * - The related course is rendered
   */
  it('filters courses by quiz title', async () => {
    mockCourseListApi();

    render(
      <MemoryRouter>
        <CourseList searchTerm="neural" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    expect(screen.queryByText('Physics Engines')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: No search results
   *
   * Scenario:
   * A search term does not match any course or related content.
   *
   * Expected behavior:
   * - No course cards are rendered
   * - A no-search-results message is displayed
   */
  it('shows no-search-results message when no courses match the search term', async () => {
    mockCourseListApi();

    render(
      <MemoryRouter>
        <CourseList searchTerm="nonexistent" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No courses match your search.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.queryByText('Physics Engines')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Create course
   *
   * Scenario:
   * The user creates a new course through the modal.
   *
   * Expected behavior:
   * - The newly created course is prepended to the list
   */
  it('prepends a newly created course to the list', async () => {
    mockCourseListApi();

    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'c3',
      name: 'Computer Vision',
      color: '#00C2A8',
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
      target: { value: 'Computer Vision' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Computer Vision')).toBeInTheDocument();
    });

    expect(screen.getByText('3 of 3 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Update course
   *
   * Scenario:
   * The user edits a course.
   *
   * Expected behavior:
   * - The matching course is updated in the list
   */
  it('updates a course in the list after editing', async () => {
    mockCourseListApi();

    vi.mocked(api.patch).mockResolvedValueOnce({
      ...courseFixtures[0],
      name: 'Advanced Machine Learning',
    });

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByLabelText(/edit course/i)[0]);
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
   * Test case: Refetch course after editing (KAN-213)
   *
   * Scenario:
   * The PATCH response and the GET response differ — for example because
   * the PATCH endpoint computes task progress against all users while the
   * GET endpoint scopes it to the current user. Without a refetch the UI
   * would show stale/incorrect numbers.
   *
   * Expected behavior:
   * - The PATCH response is applied first (optimistic).
   * - GET /courses/:id is then called for the edited course.
   * - The refetched response replaces the optimistic value.
   */
  it('refetches the course after editing and shows the refetched value', async () => {
    mockCourseListApi();

    vi.mocked(api.patch).mockResolvedValueOnce({
      ...courseFixtures[0],
      name: 'Optimistic Name',
    });

    // Wire up the single-course GET that the refetch will trigger
    const originalImpl = vi.mocked(api.get).getMockImplementation();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/c1') {
        return Promise.resolve({
          ...courseFixtures[0],
          name: 'Refetched Name',
        });
      }
      return originalImpl ? originalImpl(url) : Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByLabelText(/edit course/i)[0]);
    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Edited Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // The refetched name wins over the PATCH response
    await waitFor(() => {
      expect(screen.getByText('Refetched Name')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith('/courses/c1');
    expect(screen.queryByText('Optimistic Name')).not.toBeInTheDocument();
  });

  /**
   * Test case: Refetch failure keeps the optimistic update (KAN-213)
   *
   * Scenario:
   * GET /courses/:id fails after a successful PATCH.
   *
   * Expected behavior:
   * - The optimistic update from the PATCH response remains visible.
   * - The user is not blocked or shown an error for the failed refetch
   *   (the saved data is already applied; the next list reload will reconcile).
   */
  it('keeps the optimistic update if the refetch fails', async () => {
    mockCourseListApi();

    vi.mocked(api.patch).mockResolvedValueOnce({
      ...courseFixtures[0],
      name: 'Optimistic Name',
    });

    const originalImpl = vi.mocked(api.get).getMockImplementation();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/c1') {
        return Promise.reject(new Error('Network down'));
      }
      return originalImpl ? originalImpl(url) : Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByLabelText(/edit course/i)[0]);
    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Edited Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Optimistic Name')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith('/courses/c1');
    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
  });

  /**
   * Test case: Delete course
   *
   * Scenario:
   * The user deletes a course.
   *
   * Expected behavior:
   * - The matching course is removed from the list
   */
  it('removes a course from the list after deletion', async () => {
    mockCourseListApi();

    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByLabelText(/delete course/i)[0]);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    });

    expect(screen.getByText('1 of 1 course shown')).toBeInTheDocument();
  });
});
