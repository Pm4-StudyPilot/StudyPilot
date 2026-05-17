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
 * CourseDetailPage uses DashboardLayout which depends on useAuth.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

const courseFixture = {
  id: 'c1',
  name: 'Machine Learning Fundamentals',
  ownerId: 'u1',
  createdAt: '2026-03-26T12:00:00.000Z',
  updatedAt: '2026-03-26T12:00:00.000Z',
  taskProgress: {
    totalTasks: 2,
    completedTasks: 1,
    openTasks: 1,
    inProgressTasks: 0,
    completionPercentage: 50,
  },
};

const taskFixtures = [
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
];

const quizFixtures = [
  {
    id: 'q1',
    title: 'Neural Networks Quiz',
    description: null,
    isOrderRandom: false,
    courseId: 'c1',
    createdAt: '2026-03-26T12:00:00.000Z',
    updatedAt: '2026-03-26T12:00:00.000Z',
  },
];

const documentFixtures = [
  {
    id: 'doc-1',
    filename: 'Lecture Notes.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    createdAt: '2026-03-26T12:00:00.000Z',
  },
  {
    id: 'doc-2',
    filename: 'Project Brief.pdf',
    fileType: 'application/pdf',
    fileSize: 2048,
    createdAt: '2026-03-27T12:00:00.000Z',
  },
];

/**
 * Renders CourseDetailPage with a course route parameter.
 */
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
 * Mocks all API calls used by CourseDetailPage and its child components.
 */
function mockCourseDetailApi({
  course = courseFixture,
  tasks = taskFixtures,
  quizzes = quizFixtures,
  documents = documentFixtures,
}: {
  course?: typeof courseFixture | null;
  tasks?: typeof taskFixtures;
  quizzes?: typeof quizFixtures;
  documents?: typeof documentFixtures;
} = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/courses/c1') {
      return Promise.resolve(course);
    }

    if (url === '/courses/c1/tasks') {
      return Promise.resolve(tasks);
    }

    if (url === '/courses/c1/quizzes') {
      return Promise.resolve(quizzes);
    }

    if (url.startsWith('/documents/course/c1')) {
      return Promise.resolve(documents);
    }

    return Promise.resolve([]);
  });
}

/**
 * CourseDetailPage component tests.
 *
 * Covered scenarios:
 * - loading spinner is shown while fetching
 * - course details are rendered after successful fetch
 * - documents are rendered in the course document section
 * - error message is shown when the course request fails
 * - fallback error message is shown for non-error rejections
 * - not found message is shown when course is null
 * - course-level search filters tasks, course materials, and documents
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
   * The course API call is pending.
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
   * - The formatted creation date is rendered in the course metadata
   */
  it('renders the course name and creation metadata after a successful fetch', async () => {
    mockCourseDetailApi();

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
      expect(screen.getByText(/Created March 26, 2026/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Documents section
   *
   * Scenario:
   * The course details and documents load successfully.
   *
   * Expected behavior:
   * - The course documents section is rendered
   * - Returned document filenames are rendered
   */
  it('renders course documents by default', async () => {
    mockCourseDetailApi();

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Course Documents')).toBeInTheDocument();
      expect(screen.getByText('Lecture Notes.pdf')).toBeInTheDocument();
      expect(screen.getByText('Project Brief.pdf')).toBeInTheDocument();
    });
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
  it('shows an error message when the course fetch fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/c1') {
        return Promise.reject(new Error('Failed to load course'));
      }

      return Promise.resolve([]);
    });

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
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/c1') {
        return Promise.reject('Unexpected failure');
      }

      return Promise.resolve([]);
    });

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
    mockCourseDetailApi({ course: null });

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Course not found')).toBeInTheDocument();
      expect(screen.getByText(/backend did not return a course/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Course search
   *
   * Scenario:
   * The user enters a search term in the dashboard topbar.
   *
   * Expected behavior:
   * - Tasks are filtered by title
   * - Course materials are filtered by quiz title
   * - Documents are filtered by filename
   */
  it('filters tasks, course materials, and documents through the course search input', async () => {
    mockCourseDetailApi();

    renderWithRoute('c1');

    await waitFor(() => {
      expect(screen.getByText('Read chapter 1')).toBeInTheDocument();
      expect(screen.getByText('Submit assignment')).toBeInTheDocument();
      expect(screen.getByText('Neural Networks Quiz')).toBeInTheDocument();
      expect(screen.getByText('Lecture Notes.pdf')).toBeInTheDocument();
      expect(screen.getByText('Project Brief.pdf')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search in this course...'), {
      target: { value: 'submit' },
    });

    expect(screen.queryByText('Read chapter 1')).not.toBeInTheDocument();
    expect(screen.getByText('Submit assignment')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search in this course...'), {
      target: { value: 'neural' },
    });

    expect(screen.getByText('Neural Networks Quiz')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search in this course...'), {
      target: { value: 'brief' },
    });

    expect(screen.queryByText('Lecture Notes.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('Project Brief.pdf')).toBeInTheDocument();
  });
});
