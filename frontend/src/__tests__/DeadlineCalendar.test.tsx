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
      await screen.findByRole('button', { name: /10\.05\.2026, today, 1 deadline/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Quiz prep').length).toBeGreaterThan(0);
    expect(screen.getByText('Read chapter 5')).toBeInTheDocument();
    expect(screen.getByText('Review DNA structure flashcards.')).toBeInTheDocument();
    expect(screen.queryByText(/Biology - /)).not.toBeInTheDocument();
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

  it('shows task loading errors when deadline requests fail', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Task service unavailable'));

    render(
      <MemoryRouter>
        <DeadlineCalendar courses={[courses[0]]} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Task service unavailable')).toBeInTheDocument();
  });

  it('navigates between months and returns to the upcoming view', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    await screen.findByText('Upcoming Deadlines');
    fireEvent.click(screen.getByRole('button', { name: /03\.05\.2026, 1 deadline/i }));
    expect(screen.getByRole('heading', { name: '03.05.2026' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go to next month/i }));
    expect(screen.getByText('June 2026')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go to previous month/i }));
    expect(screen.getByText('May 2026')).toBeInTheDocument();
  });

  it('expands the upcoming deadlines preview when more tasks are available', async () => {
    const extraTasksByCourseId: Record<string, TaskDto[]> = {
      ...tasksByCourseId,
      'course-1': [
        ...tasksByCourseId['course-1'],
        {
          id: 'task-4',
          title: 'Practice exam',
          description: 'Work through the sample exam.',
          dueDate: '2026-05-13T00:00:00.000Z',
          priority: 'HIGH',
          status: 'OPEN',
          position: 2,
          completed: false,
          courseId: 'course-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'task-5',
          title: 'Final project',
          description: 'Prepare the project outline.',
          dueDate: '2026-05-14T00:00:00.000Z',
          priority: 'HIGH',
          status: 'OPEN',
          position: 3,
          completed: false,
          courseId: 'course-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'task-6',
          title: 'Essay draft',
          description: 'Write the first draft.',
          dueDate: '2026-05-15T00:00:00.000Z',
          priority: 'MEDIUM',
          status: 'OPEN',
          position: 4,
          completed: false,
          courseId: 'course-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    };

    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={extraTasksByCourseId} />
      </MemoryRouter>
    );

    const showMoreButton = await screen.findByRole('button', {
      name: /show 2 more deadlines/i,
    });

    expect(screen.queryByText('Final project')).not.toBeInTheDocument();

    fireEvent.click(showMoreButton);

    expect(screen.getByText('Final project')).toBeInTheDocument();
    expect(screen.getByText('Essay draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show fewer deadlines/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show fewer deadlines/i }));

    expect(screen.queryByText('Final project')).not.toBeInTheDocument();
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

  it('shows an empty course search state and can reset the course filter', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    await screen.findByText('Upcoming Deadlines');

    fireEvent.click(screen.getByRole('button', { name: /all courses/i }));
    fireEvent.change(screen.getByLabelText(/search courses/i), { target: { value: 'history' } });

    expect(screen.getByText('No courses found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /all courses/i }));

    expect(screen.getByRole('button', { name: /all courses/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('skips tasks without due dates and keeps completed tasks out of upcoming deadlines', async () => {
    const mixedTasksByCourseId: Record<string, TaskDto[]> = {
      'course-1': [
        {
          id: 'task-without-date',
          title: 'No due date task',
          description: null,
          dueDate: null,
          priority: 'LOW',
          status: 'OPEN',
          position: 0,
          completed: false,
          courseId: 'course-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'completed-task',
          title: 'Completed project',
          description: 'Already submitted.',
          dueDate: '2026-05-11T00:00:00.000Z',
          priority: 'MEDIUM',
          status: 'DONE',
          position: 1,
          completed: true,
          courseId: 'course-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'scheduled-task',
          title: 'Portfolio review',
          description: null,
          dueDate: '2026-05-21T00:00:00.000Z',
          priority: 'LOW',
          status: 'OPEN',
          position: 2,
          completed: false,
          courseId: 'course-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
      ],
      'course-2': [],
    };

    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={mixedTasksByCourseId} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Portfolio review')).toBeInTheDocument();
    expect(screen.queryByText('Completed project')).not.toBeInTheDocument();
    expect(screen.queryByText('No due date task')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /21\.05\.2026, 1 deadline/i })).toHaveClass(
      'deadline-calendar__day--default'
    );

    fireEvent.click(screen.getByRole('button', { name: /11\.05\.2026, 1 deadline/i }));

    expect(screen.getByText('Completed project')).toBeInTheDocument();
    expect(screen.getByText('Already submitted.')).toBeInTheDocument();
  });

  it('replaces upcoming deadlines with the selected day after clicking a date', async () => {
    render(
      <MemoryRouter>
        <DeadlineCalendar courses={courses} tasksByCourseId={tasksByCourseId} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Upcoming Deadlines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /03\.05\.2026, 1 deadline/i }));

    expect(screen.getByRole('heading', { name: '03.05.2026' })).toBeInTheDocument();
    expect(screen.queryByText('Upcoming Deadlines')).not.toBeInTheDocument();
    expect(screen.getByText('Lab recap')).toBeInTheDocument();
    expect(screen.getByText("Summarize last week's experiment notes.")).toBeInTheDocument();
    expect(screen.queryByText(/Computer Science - /)).not.toBeInTheDocument();

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
    fireEvent.click(screen.getByRole('button', { name: /03\.05\.2026/i }));

    expect(screen.getByRole('heading', { name: '03.05.2026' })).toBeInTheDocument();
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
