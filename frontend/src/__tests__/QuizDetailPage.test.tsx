import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import QuizDetailPage from '../pages/QuizDetailPage';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for quiz detail requests.
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

/**
 * Mock AuthContext.
 *
 * QuizDetailPage uses DashboardLayout which depends on useAuth.
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

const quizFixture = {
  id: 'quiz-1',
  title: 'European Capitals',
  description: 'Practice capital cities across Europe.',
  isOrderRandom: true,
  courseId: 'course-1',
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-02T12:00:00.000Z',
};

const questionFixtures = [
  {
    id: 'question-1',
    title: 'What is the capital of France?',
    description: 'Choose the correct capital city.',
    type: 'SINGLE_CHOICE' as const,
    quizId: 'quiz-1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    answers: [
      {
        id: 'answer-1',
        content: 'Paris',
        isCorrect: true,
        questionId: 'question-1',
        createdAt: '2026-05-01T12:00:00.000Z',
        updatedAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'answer-2',
        content: 'Berlin',
        isCorrect: false,
        questionId: 'question-1',
        createdAt: '2026-05-01T12:00:00.000Z',
        updatedAt: '2026-05-01T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'question-2',
    title: 'What is the capital of Spain?',
    description: null,
    type: 'SINGLE_CHOICE' as const,
    quizId: 'quiz-1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    answers: [
      {
        id: 'answer-3',
        content: 'Madrid',
        isCorrect: true,
        questionId: 'question-2',
        createdAt: '2026-05-01T12:00:00.000Z',
        updatedAt: '2026-05-01T12:00:00.000Z',
      },
    ],
  },
];

/**
 * Renders QuizDetailPage with course and quiz route parameters.
 */
function renderWithRoute(courseId = 'course-1', quizId = 'quiz-1') {
  return render(
    <MemoryRouter initialEntries={[`/courses/${courseId}/quizzes/${quizId}`]}>
      <Routes>
        <Route path="/courses/:courseId/quizzes/:quizId" element={<QuizDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Mocks all API calls used by QuizDetailPage.
 */
function mockQuizDetailApi({
  quiz = quizFixture,
  questions = questionFixtures,
}: {
  quiz?: typeof quizFixture;
  questions?: typeof questionFixtures;
} = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/courses/course-1/quizzes/quiz-1') {
      return Promise.resolve(quiz);
    }

    if (url === '/courses/course-1/quizzes/quiz-1/questions') {
      return Promise.resolve(questions);
    }

    return Promise.resolve([]);
  });
}

/**
 * QuizDetailPage component tests.
 *
 * Covered scenarios:
 * - loading spinner is shown while fetching
 * - quiz details are rendered after successful fetch
 * - quiz stats are calculated from questions and answers
 * - question list is rendered
 * - empty question state is rendered
 * - error message is shown when fetching fails
 * - fallback error message is shown for non-error rejections
 * - back link points to the course detail page
 */
describe('QuizDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading spinner while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    renderWithRoute();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders quiz details after a successful fetch', async () => {
    mockQuizDetailApi();

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('European Capitals')).toBeInTheDocument();
      expect(screen.getByText('Practice capital cities across Europe.')).toBeInTheDocument();
      expect(screen.getByText('Randomized question order')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/Updated May 2, 2026/i)).toBeInTheDocument();
  });

  it('renders calculated quiz stats', async () => {
    mockQuizDetailApi();

    renderWithRoute();

    const summary = await screen.findByLabelText('Quiz summary');

    expect(within(summary).getByText('Overview')).toBeInTheDocument();

    const questionStat = within(summary).getByText('Questions').closest('.quiz-detail__stat');
    const answerStat = within(summary).getByText('Answers').closest('.quiz-detail__stat');
    const correctStat = within(summary).getByText('Correct').closest('.quiz-detail__stat');

    expect(questionStat).not.toBeNull();
    expect(answerStat).not.toBeNull();
    expect(correctStat).not.toBeNull();

    expect(within(questionStat as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(within(questionStat as HTMLElement).getByText('Questions')).toBeInTheDocument();

    expect(within(answerStat as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(answerStat as HTMLElement).getByText('Answers')).toBeInTheDocument();

    expect(within(correctStat as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(within(correctStat as HTMLElement).getByText('Correct')).toBeInTheDocument();
  });

  it('renders questions and answers', async () => {
    mockQuizDetailApi();

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('What is the capital of Spain?')).toBeInTheDocument();
    });

    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('renders the empty question state when the quiz has no questions', async () => {
    mockQuizDetailApi({ questions: [] });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('No questions yet')).toBeInTheDocument();
    });

    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('shows an error message when the quiz fetch fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/course-1/quizzes/quiz-1') {
        return Promise.reject(new Error('Failed to load quiz'));
      }

      return Promise.resolve(questionFixtures);
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Failed to load quiz')).toBeInTheDocument();
    });
  });

  it('shows fallback error message when fetching rejects with a non-error value', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/course-1/quizzes/quiz-1') {
        return Promise.reject('Unexpected failure');
      }

      return Promise.resolve(questionFixtures);
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Failed to load quiz')).toBeInTheDocument();
    });
  });

  it('links back to the course detail page', async () => {
    mockQuizDetailApi();

    renderWithRoute();

    const backLink = screen.getByRole('link', { name: /back to course/i });

    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/courses/course-1');
  });
});
