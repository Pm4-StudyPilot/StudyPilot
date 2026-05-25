import { describe, it, expect, vi, type MockedFunction, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PlayQuizPage from '../pages/PlayQuizPage';
import { api } from '../services/api';
import * as router from 'react-router-dom';
import type { Mocked } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

const mockedUseParams = router.useParams as MockedFunction<typeof router.useParams>;
const mockedUseNavigate = router.useNavigate as MockedFunction<typeof router.useNavigate>;

mockedUseNavigate.mockReturnValue(mockNavigate);
const mockedApi = api as Mocked<typeof api>;

const mockQuiz = {
  id: 'quiz1',
  title: 'Sample Quiz',
  description: 'desc',
  courseId: 'course1',
  isOrderRandom: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const randomMockQuiz = {
  id: 'quiz2',
  title: 'Sample Quiz 2',
  description: 'desc 2',
  courseId: 'course2',
  isOrderRandom: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const cardMockQuiz = {
  id: 'quiz3',
  title: 'Sample Quiz',
  description: 'desc',
  courseId: 'course3',
  isOrderRandom: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const mockQuestions = [
  {
    id: 'q1',
    title: 'Question 1',
    description: '',
    type: 'SINGLE_CHOICE',
    answers: [
      { id: 'a1', content: 'AnswerButton', isCorrect: true },
      { id: 'a2', content: 'B', isCorrect: false },
    ],
  },
  {
    id: 'q2',
    title: 'Question 2',
    description: '',
    type: 'MULTIPLE_CHOICE',
    answers: [
      { id: 'a3', content: 'C', isCorrect: true },
      { id: 'a4', content: 'D', isCorrect: false },
      { id: 'a4', content: 'E', isCorrect: true },
    ],
  },
];
const cardMockQuestions = [
  {
    id: 'q1',
    title: 'Question 1',
    description: '',
    type: 'CARD',
    answers: [
      { id: 'a1', content: 'AnswerButton', isCorrect: true },
      { id: 'a2', content: 'B', isCorrect: false },
    ],
  },
  {
    id: 'q2',
    title: 'Question 2',
    description: '',
    type: 'CARD',
    answers: [
      { id: 'a1', content: 'AnswerButton', isCorrect: true },
      { id: 'a2', content: 'B', isCorrect: false },
    ],
  },
];
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('PlayQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseParams.mockReturnValue({
      courseId: 'course1',
      quizId: 'quiz1',
    });
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/quizzes/quiz3/questions')) {
        return Promise.resolve(cardMockQuestions);
      }
      if (url.includes('/quizzes/quiz1/questions') || url.includes('/quizzes/quiz2/questions')) {
        return Promise.resolve(mockQuestions);
      }
      if (url.includes('/quizzes/quiz2')) {
        return Promise.resolve(randomMockQuiz);
      }
      if (url.includes('/quizzes/quiz3')) {
        return Promise.resolve(cardMockQuiz);
      }

      return Promise.resolve(mockQuiz);
    });

    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

      return {
        ...actual,
        useParams: vi.fn(),
        useNavigate: vi.fn(),
      };
    });

    vi.mock('../context/useAuth', () => ({
      useAuth: () => ({
        user: { username: 'testuser', email: 'test@example.com' },
        logout: vi.fn(),
      }),
    }));
  });
  it('renders quiz title', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Sample Quiz')).toBeInTheDocument();
  });
  it('shows first question initially', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Question 1')).toBeInTheDocument();
  });
  it('reveals answers when clicking reveal', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    await screen.findByText('Question 1');

    const answerButton = screen.getByText('AnswerButton');
    fireEvent.click(answerButton);

    await waitFor(() => {
      expect(answerButton).toBeInTheDocument();
    });
  });
  it('shows the next question when clicking on next question', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    await screen.findByText('Question 1');

    const answerButton = screen.getByText('AnswerButton');
    fireEvent.click(answerButton);

    const nextButton = await screen.findByRole('button', {
      name: /next question/i,
    });

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.queryByText('Question 2')).toBeInTheDocument();
    });
  });
  it('it shows stats after the quiz and finally navigates back to the quiz page', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    await screen.findByText('Question 1');
    fireEvent.click(screen.getByText('AnswerButton'));
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Next question/i,
      })
    );

    await screen.findByText('Question 2');
    fireEvent.click(screen.getByText('C'));
    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /view stats/i }));
    fireEvent.click(await screen.findByRole('button', { name: /finish/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/courses/course1/quizzes/quiz1');
  });
  it('orders questions in a random order if the quiz is specified to do so', async () => {
    mockedUseParams.mockReturnValue({
      courseId: 'course2',
      quizId: 'quiz2',
    });

    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(1);

    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Question 2')).toBeInTheDocument();
  });
  it('indicates when there was a server error while loading the quiz', async () => {
    mockedApi.get.mockImplementation(() => {
      return Promise.reject(new Error('Internal Server Error'));
    });
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Internal Server Error')).toBeInTheDocument();
  });
  it('saves history by highlighting selected answers even after revealing the answers', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );

    await screen.findByText('Question 1');
    fireEvent.click(screen.getByText('AnswerButton'));
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Next question/i,
      })
    );

    await screen.findByText('Question 2');

    expect(screen.getByText('C').closest('.answer-card--selected')).toBeNull();
    fireEvent.click(screen.getByText('C'));
    expect(screen.getByText('C').closest('.answer-card--selected')).not.toBeNull();
    fireEvent.click(screen.getByText('C'));
    expect(screen.getByText('C').closest('.answer-card--selected')).toBeNull();
    fireEvent.click(screen.getByText('C'));

    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    expect(screen.getByText('C').closest('.answer-card--selected')).not.toBeNull();
  });

  it('lets the user decide that the answer was correct when the question type is card', async () => {
    mockedUseParams.mockReturnValue({
      courseId: 'course3',
      quizId: 'quiz3',
    });
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );
    await screen.findByText('Question 1');
    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^correct/i }));

    await screen.findByText('Question 2');
    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^correct/i }));

    expect(await screen.findByText(/2 \/ 2 Points/)).toBeInTheDocument();
    expect(screen.queryByText(/0 \/ 2 Points/)).not.toBeInTheDocument();
  });
  it('lets the user decide that the answer was incorrect when the question type is card', async () => {
    mockedUseParams.mockReturnValue({
      courseId: 'course3',
      quizId: 'quiz3',
    });
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );
    await screen.findByText('Question 1');
    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^incorrect/i }));

    await screen.findByText('Question 2');
    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^incorrect/i }));

    expect(await screen.findByText(/0 \/ 2 Points/)).toBeInTheDocument();
    expect(screen.queryByText(/2 \/ 2 Points/)).not.toBeInTheDocument();
  });
  it('calculates partial points when a multiple choice question was partially corect', async () => {
    render(
      <MemoryRouter>
        <PlayQuizPage />
      </MemoryRouter>
    );
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByText('AnswerButton'));
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Next question/i,
      })
    );

    await screen.findByText('Question 2');
    fireEvent.click(screen.getByText('C'));
    fireEvent.click(await screen.findByRole('button', { name: /reveal answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /view stats/i }));

    expect(await screen.findByText(/1.5 \/ 2 Points/)).toBeInTheDocument();
  });
});
