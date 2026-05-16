import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
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
 */
function mockHomePageApi() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/courses') return Promise.resolve(courseFixtures);

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

    if (url === '/courses/c2/tasks') return Promise.resolve([]);

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

    if (url.startsWith('/documents/course/c2')) return Promise.resolve([]);

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

    if (url === '/courses/c2/quizzes') return Promise.resolve([]);

    return Promise.resolve([]);
  });
}

/**
 * HomePage component tests.
 *
 * Covered scenarios:
 * - dashboard search bar is rendered
 * - dashboard courses can be filtered by course name
 * - dashboard courses can be filtered by task title
 * - dashboard courses can be filtered by document filename
 * - dashboard courses can be filtered by quiz title
 * - no-results state is shown when nothing matches
 * - error state is shown when loading fails
 * - featured course card links to the course detail page
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
   * - The dashboard search input is visible
   * - Empty dashboard state is shown when no courses exist
   */
  it('renders the dashboard search bar', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Search dashboard...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No courses yet')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Course search
   *
   * Scenario:
   * The user searches for a course name.
   *
   * Expected behavior:
   * - Only the matching course remains visible
   * - The shown count reflects the filtered result
   */
  it('filters courses through the dashboard search bar', async () => {
    mockHomePageApi();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: { value: 'physics' },
    });

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('Physics Engines')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Task search
   *
   * Scenario:
   * The user searches for a task title.
   *
   * Expected behavior:
   * - The related course remains visible
   * - Matching task is shown in the featured search results
   */
  it('filters dashboard results by task title', async () => {
    mockHomePageApi();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: { value: 'train' },
    });

    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('Train model')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Document search
   *
   * Scenario:
   * The user searches for a document filename.
   *
   * Expected behavior:
   * - The related course remains visible
   * - Matching document is shown in the featured search results
   */
  it('filters dashboard results by document filename', async () => {
    mockHomePageApi();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: { value: 'notes' },
    });

    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('ML Notes.pdf')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Quiz search
   *
   * Scenario:
   * The user searches for a quiz title.
   *
   * Expected behavior:
   * - The related course remains visible
   * - Matching quiz is shown in the featured search results
   */
  it('filters dashboard results by quiz title', async () => {
    mockHomePageApi();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: { value: 'neural' },
    });

    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('Neural Networks Quiz')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: No dashboard results
   *
   * Scenario:
   * The user searches for a term that matches no course-related content.
   *
   * Expected behavior:
   * - No dashboard result state is shown
   */
  it('shows no dashboard results when nothing matches the search term', async () => {
    mockHomePageApi();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search dashboard...'), {
      target: { value: 'nonexistent' },
    });

    expect(screen.getByText('No dashboard results')).toBeInTheDocument();
    expect(
      screen.getByText('No courses, tasks, quizzes, or documents match your search.')
    ).toBeInTheDocument();
    expect(screen.getByText('0 of 2 courses shown')).toBeInTheDocument();
  });

  /**
   * Test case: Dashboard load error
   *
   * Scenario:
   * The initial course request fails.
   *
   * Expected behavior:
   * - The error message is displayed
   */
  it('shows an error state when dashboard data cannot be loaded', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses') return Promise.reject(new Error('Failed to load dashboard'));
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Featured course navigation
   *
   * Scenario:
   * The dashboard renders a featured course card.
   *
   * Expected behavior:
   * - The featured course card is rendered as a clickable link
   * - The link points to the matching course detail page
   */
  it('renders the featured course card as a link to the course detail page', async () => {
    mockHomePageApi();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    const featuredCourseLink = screen.getByRole('link', {
      name: /machine learning/i,
    });

    expect(featuredCourseLink).toHaveAttribute('href', '/courses/c1');
  });
});
