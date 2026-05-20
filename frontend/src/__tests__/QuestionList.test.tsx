import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QuestionList from '../components/quizzes/QuestionList';
import { QuestionWithAnswersDto } from '../types/dto';

const questionFixtures: QuestionWithAnswersDto[] = [
  {
    id: 'question-1',
    title: 'What is the capital of France?',
    description: 'Choose the correct capital city.',
    type: 'SINGLE_CHOICE',
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
    ],
  },
  {
    id: 'question-2',
    title: 'Which planet is known as the Red Planet?',
    description: null,
    type: 'MULTIPLE_CHOICE',
    quizId: 'quiz-1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    answers: [
      {
        id: 'answer-2',
        content: 'Mars',
        isCorrect: true,
        questionId: 'question-2',
        createdAt: '2026-05-01T12:00:00.000Z',
        updatedAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'answer-3',
        content: 'Venus',
        isCorrect: false,
        questionId: 'question-2',
        createdAt: '2026-05-01T12:00:00.000Z',
        updatedAt: '2026-05-01T12:00:00.000Z',
      },
    ],
  },
];

/**
 * QuestionList component tests.
 *
 * Covered scenarios:
 * - renders an empty state when no questions exist
 * - renders all provided questions
 * - renders question answers through QuestionCard
 */
describe('QuestionList', () => {
  it('renders the empty state when no questions exist', () => {
    render(<QuestionList questions={[]} />);

    expect(screen.getByText('No questions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Once questions are added, they will appear here.')
    ).toBeInTheDocument();
  });

  it('renders all provided questions', () => {
    render(<QuestionList questions={questionFixtures} />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('Which planet is known as the Red Planet?')).toBeInTheDocument();
  });

  it('renders answers for each question', () => {
    render(<QuestionList questions={questionFixtures} />);

    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Mars')).toBeInTheDocument();
    expect(screen.getByText('Venus')).toBeInTheDocument();
  });
});
