import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CourseFeed, { CourseFeedItem } from '../components/courses/CourseFeed';
import { QuizDto } from '../types/dto';

describe('CourseFeed', () => {
  const quizA: QuizDto = {
    id: 'q1',
    title: 'Algebra basics',
    description: 'A quick algebra quiz',
    isOrderRandom: false,
    courseId: 'c1',
    createdAt: '2026-04-30T10:00:00.000Z',
    updatedAt: '2026-04-30T10:00:00.000Z',
  };

  const quizB: QuizDto = {
    id: 'q2',
    title: 'Biology fundamentals',
    description: 'Intro to cells and DNA',
    isOrderRandom: true,
    courseId: 'c1',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  };

  const items: CourseFeedItem[] = [
    { type: 'quiz', data: quizB },
    { type: 'quiz', data: quizA },
  ];

  it('renders course materials heading', () => {
    render(
      <MemoryRouter>
        <CourseFeed items={items} />
      </MemoryRouter>
    );

    expect(screen.getByText('Course Materials')).toBeInTheDocument();
  });

  it('renders all quiz cards', () => {
    render(
      <MemoryRouter>
        <CourseFeed items={items} />
      </MemoryRouter>
    );

    expect(screen.getByText('Algebra basics')).toBeInTheDocument();
    expect(screen.getByText('Biology fundamentals')).toBeInTheDocument();
  });

  it('sorts quizzes by date added (newest first) by default', () => {
    render(
      <MemoryRouter>
        <CourseFeed items={items} />
      </MemoryRouter>
    );

    const quizTitles = screen
      .getAllByRole('link')
      .map((link) => link.querySelector('h4')?.textContent?.trim());
    expect(quizTitles[0]).toBe('Biology fundamentals');
    expect(quizTitles[1]).toBe('Algebra basics');
  });

  it('sorts quizzes by title when title option is selected', () => {
    render(
      <MemoryRouter>
        <CourseFeed items={items} />
      </MemoryRouter>
    );

    const sortButton = screen.getByRole('button', { name: /sort by:/i });
    fireEvent.click(sortButton);

    const titleOption = screen.getByRole('button', { name: /^title$/i });
    fireEvent.click(titleOption);

    const quizTitles = screen
      .getAllByRole('link')
      .map((link) => link.querySelector('h4')?.textContent?.trim());
    expect(quizTitles[0]).toBe('Algebra basics');
    expect(quizTitles[1]).toBe('Biology fundamentals');
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <MemoryRouter>
        <CourseFeed items={items} />
      </MemoryRouter>
    );

    const sortButton = screen.getByRole('button', { name: /sort by:/i });
    fireEvent.click(sortButton);

    expect(screen.getByRole('button', { name: /^title$/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('button', { name: /^title$/i })).not.toBeInTheDocument();
  });

  it('renders empty state when no items provided', () => {
    render(
      <MemoryRouter>
        <CourseFeed items={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText(/no course materials yet/i)).toBeInTheDocument();
  });
});
