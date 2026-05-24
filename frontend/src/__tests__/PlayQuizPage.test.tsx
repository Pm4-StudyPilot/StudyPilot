import { describe, it, expect, vi, type MockedFunction } from 'vitest';
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
mockedUseParams.mockReturnValue({
  courseId: 'course1',
  quizId: 'quiz1',
});

mockedUseNavigate.mockReturnValue(mockNavigate);
const mockedApi = api as Mocked<typeof api>;
mockedApi.get.mockImplementation((url: string) => {
  if (url.includes('/quizzes/quiz1/questions')) {
    return Promise.resolve(mockQuestions);
  }

  return Promise.resolve(mockQuiz);
});

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

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

const mockQuiz = {
  id: 'quiz1',
  title: 'Sample Quiz',
  description: 'desc',
  courseId: 'course1',
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
    type: 'SINGLE_CHOICE',
    answers: [
      { id: 'a3', content: 'C', isCorrect: true },
      { id: 'a4', content: 'D', isCorrect: false },
    ],
  },
];

describe('PlayQuizPage', () => {
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
  it('navigates back when quiz is finished', async () => {
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

    await screen.findByText('Question 2');

    fireEvent.click(screen.getByText('C'));
    fireEvent.click(await screen.findByRole('button', { name: /quiz finished/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/courses/course1/quizzes/quiz1');
  });
});
