import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuizCard from '../components/quizzes/QuizCard';
import { QuizDto } from '../types/dto';

describe('QuizCard', () => {
  const quiz: QuizDto = {
    id: 'q1',
    title: 'Physics Fundamentals',
    description: 'Learn the basics of motion and energy',
    isOrderRandom: false,
    courseId: 'c1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
  };

  it('renders quiz title and description', () => {
    render(
      <MemoryRouter>
        <QuizCard quiz={quiz} />
      </MemoryRouter>
    );

    expect(screen.getByText('Physics Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Learn the basics of motion and energy')).toBeInTheDocument();
  });

  it('wraps the card in a link to the quiz detail page', () => {
    render(
      <MemoryRouter>
        <QuizCard quiz={quiz} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /physics fundamentals/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/courses/c1/quizzes/q1');
  });
});
