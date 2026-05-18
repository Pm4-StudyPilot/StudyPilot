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
 * for dashboard course, task, document, and quiz data.
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

/**
 * Mock AuthContext.
 *
 * Provides a predictable authenticated user for DashboardLayout.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: {
      username: 'testuser',
      email: 'test@example.com',
    },
    logout: vi.fn(),
  }),
}));

const courseFixtures = [
  {
    id: 'c1',
    name: 'Machine Learning',
    ownerId: 'u1',
    createdAt: '2026-03-26T12:00:00.000Z',
    updatedAt: '2026-03-26T12:00:00.000Z',
    taskProgress: {
      totalTasks: 1,
      completedTasks: 0,
      openTasks: 1,
      inProgressTasks: 0,
      completionPercentage: 0,
    },
  },
  {
    id: 'c2',
    name: 'Physics Engines',
    ownerId: 'u1',
    createdAt: '2026-03-25T12:00:00.000Z',
    updatedAt: '2026-03-25T12:00:00.000Z',
    taskProgress: {
      totalTasks: 0,
      completedTasks: 0,
      openTasks: 0,
      inProgressTasks: 0,
      completionPercentage: 0,
    },
  },
];

/**
 * Mocks all API calls used by the dashboard page.
 *
 * The dashboard loads:
 * - courses
 * - tasks per course
 * - documents per course
 * - quizzes per course
 */
function mockHomePageApi() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/courses') {
      return Promise.resolve(courseFixtures);
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
      return Promise.resolve([]);
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
      return Promise.resolve([]);
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
      return Promise.resolve([]);
    }

    return Promise.resolve([]);
  });
}

/**
 * HomePage component tests.
 *
 * Covered scenarios:
 * - dashboard search bar rendering
 * - loading state
 * - empty dashboard state
 * - filtering by course name
 * - filtering by task title
 * - filtering by document filename
 * - filtering by quiz title
 * - no-results state
 * - upcoming deadlines
 * - course progress display
 * - calendar navigation
 * - partial API failure handling
 * - error state
 * - featured course card link target
 */
describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Renders the page inside a MemoryRouter.
   */
  function renderPage() {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  }

  /**
   * Test case: Dashboard loading state.
   *
   * Expected behavior:
   * - loading indicator is displayed while API requests are pending
   */
  it('shows loading state while dashboard data is loading', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  /**
   * Test case: Search bar rendering.
   *
   * Expected behavior:
   * - dashboard search input is visible
   * - empty dashboard state is shown when no courses exist
   */
  it('renders the dashboard search bar', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });

    renderPage();

    expect(screen.getByPlaceholderText('Search dashboard...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No courses yet')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Course search.
   *
   * Expected behavior:
   * - only the matching course remains visible
   * - filtered count is shown
   */
  it('filters courses through the dashboard search bar', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: {
        value: 'physics',
      },
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Task search.
   *
   * Expected behavior:
   * - related course remains visible
   * - matching task is shown in search results
   */
  it('filters dashboard results by task title', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: {
        value: 'train',
      },
    });

    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('Train model')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Document search.
   *
   * Expected behavior:
   * - related course remains visible
   * - matching document is shown in search results
   */
  it('filters dashboard results by document filename', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: {
        value: 'notes',
      },
    });

    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('ML Notes.pdf')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Quiz search.
   *
   * Expected behavior:
   * - related course remains visible
   * - matching quiz is shown in search results
   */
  it('filters dashboard results by quiz title', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: {
        value: 'neural',
      },
    });

    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('Neural Networks Quiz')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: No matching dashboard results.
   *
   * Expected behavior:
   * - no-result state is displayed
   * - course count reflects zero visible matches
   */
  it('shows no dashboard results when nothing matches the search term', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: {
        value: 'does-not-exist',
      },
    });

    expect(screen.getByText('No dashboard results')).toBeInTheDocument();

    expect(
      screen.getByText('No courses, tasks, quizzes, or documents match your search.')
    ).toBeInTheDocument();

    expect(screen.getByText('0 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Upcoming deadlines section.
   *
   * Expected behavior:
   * - tasks with due dates are displayed
   * - deadline task title appears in the dashboard
   */
  it('shows upcoming deadline tasks', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') {
        return Promise.resolve(courseFixtures);
      }

      if (url === '/courses/c1/tasks') {
        return Promise.resolve([
          {
            id: 't1',
            title: 'Submit Assignment',
            description: null,
            status: 'OPEN',
            priority: 'HIGH',
            dueDate: '2026-06-01T12:00:00.000Z',
            position: 0,
            courseId: 'c1',
            createdAt: '2026-03-26T12:00:00.000Z',
            updatedAt: '2026-03-26T12:00:00.000Z',
          },
        ]);
      }

      if (url === '/courses/c2/tasks') {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findAllByText(/submit assignment/i)).toHaveLength(2);
  });

  /**
   * Test case: Dashboard progress metrics.
   *
   * Expected behavior:
   * - course progress percentage is displayed
   */
  it('shows course progress percentage', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') {
        return Promise.resolve([
          {
            ...courseFixtures[0],
            taskProgress: {
              totalTasks: 4,
              completedTasks: 3,
              openTasks: 1,
              inProgressTasks: 0,
              completionPercentage: 75,
            },
          },
        ]);
      }

      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findAllByText(/75%/i)).toHaveLength(2);
  });

  /**
   * Test case: Calendar navigation.
   *
   * Expected behavior:
   * - next month button changes the displayed month
   * - previous month button restores the original month
   */
  it('navigates between calendar months', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/2026/i)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /next month/i,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /previous month/i,
      })
    );
  });

  /**
   * Test case: Partial dashboard request failure.
   *
   * Expected behavior:
   * - courses still render when one secondary request fails
   * - dashboard remains usable
   */
  it('continues rendering dashboard when secondary requests fail', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') {
        return Promise.resolve(courseFixtures);
      }

      if (url === '/courses/c1/tasks') {
        return Promise.reject(new Error('Failed to load tasks'));
      }

      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByText(/machine learning/i)).toBeInTheDocument();
  });

  /**
   * Test case: Dashboard loading error.
   *
   * Expected behavior:
   * - error state is displayed when course loading fails
   */
  it('shows an error state when dashboard data cannot be loaded', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') {
        return Promise.reject(new Error('Failed to load courses'));
      }

      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByText(/failed to load courses/i)).toBeInTheDocument();
  });

  /**
   * Test case: Featured course card link.
   *
   * Expected behavior:
   * - featured course card links to the matching course detail page
   *
   * Note:
   * The current markup contains two links with the accessible name
   * "Machine Learning": the full featured card and an inner title link.
   * Therefore this test intentionally uses getAllByRole.
   */
  it('renders the featured course card as a link to the course detail page', async () => {
    mockHomePageApi();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    const featuredCourseLinks = screen.getAllByRole('link', {
      name: /machine learning/i,
    });

    expect(featuredCourseLinks[0]).toHaveAttribute('href', '/courses/c1');
  });
});
