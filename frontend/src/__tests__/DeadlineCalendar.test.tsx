import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../services/api';
import DeadlineCalendar from '../components/calendar/DeadlineCalendar';
import { CourseDto, TaskDto } from '../types/dto';

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

const courses: CourseDto[] = [
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

const tasksByCourseId: Record<string, TaskDto[]> = {
  'course-1': [
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
  'course-2': [
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

const tasksByEndpoint = {
  '/courses/course-1/tasks': tasksByCourseId['course-1'],
  '/courses/course-2/tasks': tasksByCourseId['course-2'],
};

describe('DeadlineCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading state while deadlines are loading', () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} coursesLoading />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading deadlines/i)).toBeInTheDocument();
  });

  it('renders today and the upcoming deadlines list from preloaded course tasks', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    expect(await screen.findByText('May 2026')).toBeInTheDocument();
    expect(await screen.findByText('Upcoming Deadlines')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all courses/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /may 10, 2026, today, 1 deadline/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Quiz prep').length).toBeGreaterThan(0);
    expect(screen.getByText('Read chapter 5')).toBeInTheDocument();
    expect(screen.getAllByText(/Biology - /).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.deadline-calendar__date-badge')).toHaveLength(2);
    expect(document.querySelectorAll('.deadline-calendar__day-dot').length).toBeGreaterThan(0);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches tasks when preloaded task data is not provided', async () => {
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

    expect(await screen.findByText('Read chapter 5')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/courses/course-1/tasks');
    expect(api.get).toHaveBeenCalledWith('/courses/course-2/tasks');
  });

  it('filters calendar dots and upcoming deadlines by course', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    await screen.findByText('Upcoming Deadlines');
    expect(document.querySelectorAll('.deadline-calendar__day-dot')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /all courses/i }));
    fireEvent.change(screen.getByLabelText(/search courses/i), { target: { value: 'bio' } });
    fireEvent.click(screen.getByRole('option', { name: /biology/i }));

    expect(screen.getByText('Quiz prep')).toBeInTheDocument();
    expect(screen.queryByText('Read chapter 5')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /computer science/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.deadline-calendar__day-dot')).toHaveLength(1);
  });

  it('replaces upcoming deadlines with the selected day after clicking a date', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Upcoming Deadlines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /may 3, 2026, 1 deadline/i }));

    expect(screen.getByRole('heading', { name: 'May 3, 2026' })).toBeInTheDocument();
    expect(screen.queryByText('Upcoming Deadlines')).not.toBeInTheDocument();
    expect(screen.getByText('Lab recap')).toBeInTheDocument();
    expect(screen.getAllByText(/Computer Science - /).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /show upcoming deadlines/i }));

    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
    expect(screen.queryByText('Lab recap')).not.toBeInTheDocument();
  });

  it('applies the course filter to the selected day view', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    await screen.findByText('Upcoming Deadlines');

    fireEvent.click(screen.getByRole('button', { name: /all courses/i }));
    fireEvent.change(screen.getByLabelText(/search courses/i), { target: { value: 'bio' } });
    fireEvent.click(screen.getByRole('option', { name: /biology/i }));
    fireEvent.click(screen.getByRole('button', { name: /may 3, 2026/i }));

    expect(screen.getByRole('heading', { name: 'May 3, 2026' })).toBeInTheDocument();
    expect(screen.getByText('No task deadlines fall on this date.')).toBeInTheDocument();
    expect(screen.queryByText('Lab recap')).not.toBeInTheDocument();
  });

  it('links each task back to its course through the course chip', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    const biologyLinks = await screen.findAllByRole('link', { name: /quiz prep/i });

    expect(biologyLinks[0]).toHaveAttribute('href', '/courses/course-2');
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
