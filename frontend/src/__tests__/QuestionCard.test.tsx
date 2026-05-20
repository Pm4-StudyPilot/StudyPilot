import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QuestionCard from '../components/quizzes/QuestionCard';
import { QuestionWithAnswersDto } from '../types/dto';

const questionFixture: QuestionWithAnswersDto = {
  id: 'question-1',
  title: 'What is the capital of France?',
  description: 'Choose the correct capital city.',
  type: 'MULTIPLE_CHOICE',
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
};

/**
 * QuestionCard component tests.
 *
 * Covered scenarios:
 * - renders question title, description, and formatted type
 * - renders answer statistics
 * - renders answers with correct and incorrect labels
 * - omits the description when no description exists
 */
describe('QuestionCard', () => {
  it('renders the question title, description, and formatted type', () => {
    render(<QuestionCard question={questionFixture} />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('Choose the correct capital city.')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
  });

  it('renders answer statistics', () => {
    render(<QuestionCard question={questionFixture} />);

    expect(screen.getByText('2 answers')).toBeInTheDocument();
    expect(screen.getByText('1 correct answer')).toBeInTheDocument();
  });

  it('renders answers with correct and incorrect labels', () => {
    render(<QuestionCard question={questionFixture} />);

    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('does not render a description when the question has no description', () => {
    render(
      <QuestionCard
        question={{
          ...questionFixture,
          description: null,
        }}
      />
    );

    expect(screen.queryByText('Choose the correct capital city.')).not.toBeInTheDocument();
  });
});
