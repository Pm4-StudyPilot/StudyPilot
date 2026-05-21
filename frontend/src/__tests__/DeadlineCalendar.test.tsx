import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../services/api';
import DeadlineCalendar from '../components/calendar/DeadlineCalendar';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../utils/calendar', async () => {
  const actual = await vi.importActual<typeof import('../utils/calendar')>('../utils/calendar');

  return {
    ...actual,
    getTodayDateKey: () => '2026-05-10',
  };
});

const courses = [
  {
    id: 'course-1',
    name: 'Computer Science',
    color: '#6C63FF',
    ownerId: 'user-1',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 'course-2',
    name: 'Biology',
    color: '#4DA3FF',
    ownerId: 'user-1',
    createdAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
  },
];

const tasksByEndpoint = {
  '/courses/course-1/tasks': [
    {
      id: 'task-1',
      title: 'Read chapter 5',
      description: 'Review the compiler chapter before class.',
      dueDate: '2026-05-12T00:00:00.000Z',
      priority: 'HIGH',
      status: 'OPEN',
      position: 0,
      completed: false,
      courseId: 'course-1',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Lab recap',
      description: "Summarize last week's experiment notes.",
      dueDate: '2026-05-03T00:00:00.000Z',
      priority: 'MEDIUM',
      status: 'OPEN',
      position: 1,
      completed: false,
      courseId: 'course-1',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
    },
  ],
  '/courses/course-2/tasks': [
    {
      id: 'task-3',
      title: 'Quiz prep',
      description: 'Review DNA structure flashcards.',
      dueDate: '2026-05-10T00:00:00.000Z',
      priority: 'LOW',
      status: 'OPEN',
      position: 0,
      completed: false,
      courseId: 'course-2',
      createdAt: '2026-05-02T10:00:00.000Z',
      updatedAt: '2026-05-02T10:00:00.000Z',
    },
  ],
};

describe('DeadlineCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders today and the upcoming deadlines list from existing course tasks', async () => {
    vi.mocked(api.get).mockImplementation((endpoint: string) => {
      if (endpoint in tasksByEndpoint) {
        return Promise.resolve(tasksByEndpoint[endpoint as keyof typeof tasksByEndpoint]);
      }

      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} />
      </MemoryRouter>
    );

    expect(await screen.findByText('May 2026')).toBeInTheDocument();
    expect(await screen.findByText('Upcoming Deadlines')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /may 10, 2026, today, 1 deadline/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Quiz prep').length).toBeGreaterThan(0);
    expect(screen.getByText('Read chapter 5')).toBeInTheDocument();
    expect(screen.getByText('Due soon')).toBeInTheDocument();
    expect(screen.getAllByText('Due today').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.deadline-calendar__day-dot').length).toBeGreaterThan(0);
    expect(document.querySelector('.deadline-calendar__day-count')).not.toBeInTheDocument();
    expect(screen.queryByText('Selected day')).not.toBeInTheDocument();
  });

  it('replaces upcoming deadlines with the selected day after clicking a date', async () => {
    vi.mocked(api.get).mockImplementation((endpoint: string) => {
      if (endpoint in tasksByEndpoint) {
        return Promise.resolve(tasksByEndpoint[endpoint as keyof typeof tasksByEndpoint]);
      }

      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Upcoming Deadlines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /may 3, 2026, 1 deadline/i }));

    expect(screen.getByRole('heading', { name: 'May 3, 2026' })).toBeInTheDocument();
    expect(screen.queryByText('Upcoming Deadlines')).not.toBeInTheDocument();
    expect(screen.getByText('Lab recap')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getAllByText('Computer Science').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /show upcoming deadlines/i }));

    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
    expect(screen.queryByText('Lab recap')).not.toBeInTheDocument();
  });

  it('links each task back to its course through the course chip', async () => {
    vi.mocked(api.get).mockImplementation((endpoint: string) => {
      if (endpoint in tasksByEndpoint) {
        return Promise.resolve(tasksByEndpoint[endpoint as keyof typeof tasksByEndpoint]);
      }

      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} />
      </MemoryRouter>
    );

    const biologyLinks = await screen.findAllByRole('link', { name: /biology/i });

    expect(biologyLinks[0]).toHaveAttribute('href', '/courses/course-2');
    expect(screen.queryByText('Open course')).not.toBeInTheDocument();
  });

  it('shows an error state when the course request fails', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar
          courses={courses}
          coursesError="Failed to load deadlines"
          coursesLoading={false}
        />
      </MemoryRouter>
    );

    expect(await screen.findByText(/failed to load deadlines/i)).toBeInTheDocument();
  });
});
