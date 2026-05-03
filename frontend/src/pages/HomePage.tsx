import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressRing from '../components/shared/ProgressRing';
import { api } from '../services/api';
import { CourseDto, TaskDto } from '../types/dto';
import DashboardLayout from '../components/shared/layout/DashboardLayout';

type RingVariant = 'primary' | 'secondary' | 'tertiary' | 'quaternary';

type DashboardAssignment = {
  id: string;
  title: string;
  meta: string;
  status: 'urgent' | 'done';
};

type DocumentDto = {
  id: string;
  filename: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

type QuizDto = {
  id: string;
  title: string;
  description: string | null;
  isOrderRandom: boolean;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardCourseData = {
  course: CourseDto;
  tasks: TaskDto[];
  documents: DocumentDto[];
  quizzes: QuizDto[];
  taskError?: string;
  documentError?: string;
  quizError?: string;
};

type DeadlineItem = {
  id: string;
  month: string;
  day: string;
  title: string;
  courseName: string;
  time: string;
  variant: RingVariant;
};

const COURSE_VARIANTS: RingVariant[] = ['primary', 'secondary', 'tertiary', 'quaternary'];
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getVariant(index: number): RingVariant {
  return COURSE_VARIANTS[index % COURSE_VARIANTS.length];
}

function buildCalendarDays(currentDate: Date) {
  const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      label: date.getDate(),
      currentMonth: date.getMonth() === currentDate.getMonth(),
      isToday:
        date.getDate() === currentDate.getDate() &&
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear(),
    };
  });
}

function formatDeadlineTime(value: string | null) {
  if (!value) return 'No due time';

  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortDate(value: string | null) {
  if (!value) return 'No due date';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function createTaskMeta(task: TaskDto) {
  if (task.status === 'DONE') {
    return `Completed - ${task.priority.toLowerCase()} priority`;
  }

  if (task.dueDate) {
    return `Due ${formatShortDate(task.dueDate)} - ${task.priority.toLowerCase()} priority`;
  }

  return `${task.status.replace('_', ' ').toLowerCase()} - ${task.priority.toLowerCase()} priority`;
}

function buildFeaturedAssignments(tasks: TaskDto[]): DashboardAssignment[] {
  return [...tasks]
    .sort((a, b) => {
      if (a.status === 'DONE' && b.status !== 'DONE') return 1;
      if (a.status !== 'DONE' && b.status === 'DONE') return -1;

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return a.position - b.position;
    })
    .slice(0, 2)
    .map((task) => ({
      id: task.id,
      title: task.title,
      meta: createTaskMeta(task),
      status: task.status === 'DONE' ? 'done' : 'urgent',
    }));
}

function buildCourseSupportMeta(data: DashboardCourseData) {
  const nextTask = [...data.tasks]
    .filter((task) => task.status !== 'DONE')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return a.position - b.position;
    })[0];

  if (nextTask) {
    return `Next task: ${nextTask.title}`;
  }

  if (data.quizzes.length > 0) {
    return `Quiz available: ${data.quizzes[0].title}`;
  }

  if (data.documents.length > 0) {
    return `Document uploaded: ${data.documents[0].filename}`;
  }

  if (data.taskError || data.quizError || data.documentError) {
    return 'Supporting dashboard data could not be fully loaded';
  }

  return 'No tasks, quizzes, or documents available';
}

function buildDeadlineItems(
  courses: DashboardCourseData[],
  currentDate: Date
): { items: DeadlineItem[]; missingDueDates: boolean } {
  const startOfToday = new Date(currentDate);
  startOfToday.setHours(0, 0, 0, 0);

  const allTasks = courses.flatMap((entry, index) =>
    entry.tasks.map((task) => ({
      task,
      courseName: entry.course.name,
      variant: getVariant(index),
    }))
  );

  const dueTasks = allTasks
    .filter(({ task }) => task.dueDate)
    .sort(
      (a, b) =>
        new Date(a.task.dueDate as string).getTime() - new Date(b.task.dueDate as string).getTime()
    );

  const upcoming = dueTasks
    .filter(({ task }) => new Date(task.dueDate as string).getTime() >= startOfToday.getTime())
    .slice(0, 3);

  return {
    items: upcoming.map(({ task, courseName, variant }) => {
      const dueDate = new Date(task.dueDate as string);

      return {
        id: task.id,
        month: dueDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: String(dueDate.getDate()).padStart(2, '0'),
        title: task.title,
        courseName,
        time: formatDeadlineTime(task.dueDate),
        variant,
      };
    }),
    missingDueDates: dueTasks.length === 0,
  };
}

function collectDashboardWarnings(data: DashboardCourseData[]) {
  const warnings = new Set<string>();

  if (data.some((entry) => entry.taskError)) {
    warnings.add('Some task data could not be loaded.');
  }

  if (data.some((entry) => entry.quizError)) {
    warnings.add('Some quiz data could not be loaded.');
  }

  if (data.some((entry) => entry.documentError)) {
    warnings.add('Some document data could not be loaded.');
  }

  return [...warnings];
}

async function loadDashboardCourseData(courses: CourseDto[]) {
  const results = await Promise.all(
    courses.map(async (course) => {
      const [tasksResult, documentsResult, quizzesResult] = await Promise.allSettled([
        api.get<TaskDto[]>(`/courses/${course.id}/tasks`),
        api.get<DocumentDto[]>(`/documents/course/${course.id}`),
        api.get<QuizDto[]>(`/courses/${course.id}/quizzes`),
      ]);

      return {
        course,
        tasks: tasksResult.status === 'fulfilled' ? tasksResult.value : [],
        documents: documentsResult.status === 'fulfilled' ? documentsResult.value : [],
        quizzes: quizzesResult.status === 'fulfilled' ? quizzesResult.value : [],
        taskError:
          tasksResult.status === 'rejected'
            ? tasksResult.reason instanceof Error
              ? tasksResult.reason.message
              : 'Failed to load tasks'
            : undefined,
        documentError:
          documentsResult.status === 'rejected'
            ? documentsResult.reason instanceof Error
              ? documentsResult.reason.message
              : 'Failed to load documents'
            : undefined,
        quizError:
          quizzesResult.status === 'rejected'
            ? quizzesResult.reason instanceof Error
              ? quizzesResult.reason.message
              : 'Failed to load quizzes'
            : undefined,
      } satisfies DashboardCourseData;
    })
  );

  return results;
}

function FeaturedCourseCard({ data }: { data: DashboardCourseData }) {
  const progress = data.course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const assignments = buildFeaturedAssignments(data.tasks);
  const quizSummary =
    data.quizzes.length > 0
      ? `${data.quizzes.length} quiz${data.quizzes.length !== 1 ? 'zes' : ''} available`
      : 'No quizzes available';

  return (
    <article className="dashboard-featured-card">
      <div className="dashboard-featured-card__content">
        <div className="dashboard-featured-card__eyebrow">
          <span className="dashboard-pill">
            {progress.openTasks > 0 ? 'Action Needed' : 'On Track'}
          </span>
          <span>{quizSummary}</span>
        </div>
        <h2 className="dashboard-featured-card__title">{data.course.name}</h2>

        <div className="dashboard-featured-card__section-label">Recent Assignments</div>
        {assignments.length > 0 ? (
          <div className="dashboard-featured-card__assignments">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`dashboard-assignment dashboard-assignment--${assignment.status}`}
              >
                <div>
                  <div className="dashboard-assignment__title">{assignment.title}</div>
                  <div className="dashboard-assignment__meta">{assignment.meta}</div>
                </div>
                <i
                  className={`fa-solid ${
                    assignment.status === 'done' ? 'fa-circle-check' : 'fa-angle-right'
                  }`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-section-message">
            {data.taskError
              ? `Tasks unavailable: ${data.taskError}`
              : 'No task data is available for this course yet.'}
          </div>
        )}
      </div>

      <div className="dashboard-featured-card__progress">
        <div className="dashboard-featured-card__chip">
          <i className="fa-solid fa-microchip" />
        </div>
        <div className="dashboard-featured-card__ring-wrap">
          <ProgressRing
            openTasks={progress.openTasks}
            inProgressTasks={progress.inProgressTasks}
            completedTasks={progress.completedTasks}
            totalTasks={progress.totalTasks}
            label={`${progress.completionPercentage}% complete`}
            variant="primary"
            size={152}
            className="dashboard-featured-card__ring"
          />
          <div className="dashboard-featured-card__ring-center">
            <strong>{progress.completionPercentage}%</strong>
            <span>overall</span>
          </div>
        </div>
        <p className="dashboard-featured-card__summary">
          {progress.completedTasks} / {progress.totalTasks || 0} tasks completed
        </p>
      </div>
    </article>
  );
}

function CompactCourseCard({ data, index }: { data: DashboardCourseData; index: number }) {
  const progress = data.course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const variant = getVariant(index);
  const quizLabel =
    data.quizzes.length > 0
      ? `${data.quizzes.length} quiz${data.quizzes.length !== 1 ? 'zes' : ''}`
      : 'No quizzes';

  return (
    <Link to={`/courses/${data.course.id}`} className="dashboard-course-card">
      <div className="dashboard-course-card__ring-wrap">
        <ProgressRing
          openTasks={progress.openTasks}
          inProgressTasks={progress.inProgressTasks}
          completedTasks={progress.completedTasks}
          totalTasks={progress.totalTasks}
          label={`${progress.completionPercentage}% complete`}
          variant={variant}
          size={96}
        />
        <div className="dashboard-course-card__ring-center">{progress.completionPercentage}%</div>
      </div>

      <div className="dashboard-course-card__body">
        <div className="dashboard-course-card__code">{quizLabel}</div>
        <h3 className="dashboard-course-card__title">{data.course.name}</h3>
        <div className="dashboard-course-card__meta">{buildCourseSupportMeta(data)}</div>
      </div>
    </Link>
  );
}

function DashboardRail({
  currentDate,
  deadlines,
  dueThisWeek,
  averageProgress,
  missingDueDates,
}: {
  currentDate: Date;
  deadlines: DeadlineItem[];
  dueThisWeek: number;
  averageProgress: number;
  missingDueDates: boolean;
}) {
  const calendarDays = buildCalendarDays(currentDate);

  return (
    <aside className="dashboard-rail">
      <section className="dashboard-rail__panel">
        <div className="dashboard-rail__header">
          <h2>
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <div className="dashboard-rail__month-actions">
            <button type="button" aria-label="Previous month">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" aria-label="Next month">
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>

        <div className="dashboard-calendar">
          {WEEKDAY_LABELS.map((weekday, index) => (
            <span key={`${weekday}-${index}`} className="dashboard-calendar__weekday">
              {weekday}
            </span>
          ))}
          {calendarDays.map((day) => (
            <span
              key={`${day.label}-${day.currentMonth}-${day.isToday}`}
              className={[
                'dashboard-calendar__day',
                day.currentMonth ? '' : 'dashboard-calendar__day--muted',
                day.isToday ? 'dashboard-calendar__day--today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day.label}
            </span>
          ))}
        </div>
      </section>

      <section className="dashboard-rail__panel">
        <h2 className="dashboard-rail__section-title">Upcoming Deadlines</h2>
        {deadlines.length > 0 ? (
          <div className="dashboard-deadlines">
            {deadlines.map((deadline) => (
              <div key={deadline.id} className="dashboard-deadline">
                <div
                  className={`dashboard-deadline__date dashboard-deadline__date--${deadline.variant}`}
                >
                  <span>{deadline.month}</span>
                  <strong>{deadline.day}</strong>
                </div>
                <div>
                  <div className="dashboard-deadline__title">{deadline.title}</div>
                  <div className="dashboard-deadline__meta">
                    {deadline.courseName} - {deadline.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-section-message">
            {missingDueDates
              ? 'No tasks with due dates are available from the backend.'
              : 'No upcoming deadlines are currently scheduled.'}
          </div>
        )}
      </section>

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <strong>{dueThisWeek}</strong>
          <span>Due this week</span>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card--highlight">
          <strong>{averageProgress}%</strong>
          <span>Avg progress</span>
        </div>
      </div>
    </aside>
  );
}

export default function HomePage() {
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const courses = await api.get<CourseDto[]>('/courses');
        const data = await loadDashboardCourseData(courses);

        if (cancelled) return;
        setDashboardCourses(data);
        setError('');
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentDate = useMemo(() => new Date(), []);
  const featuredCourse = dashboardCourses[0] ?? null;
  const compactCourses = dashboardCourses.slice(1, 4);
  const averageProgress =
    dashboardCourses.length > 0
      ? Math.round(
          dashboardCourses.reduce(
            (sum, entry) => sum + (entry.course.taskProgress?.completionPercentage ?? 0),
            0
          ) / dashboardCourses.length
        )
      : 0;

  const { items: deadlines, missingDueDates } = useMemo(
    () => buildDeadlineItems(dashboardCourses, currentDate),
    [dashboardCourses, currentDate]
  );

  const dueThisWeek = useMemo(() => {
    const startOfToday = new Date(currentDate);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 7);

    return dashboardCourses
      .flatMap((entry) => entry.tasks)
      .filter((task) => {
        if (!task.dueDate || task.status === 'DONE') return false;

        const dueDate = new Date(task.dueDate).getTime();
        return dueDate >= startOfToday.getTime() && dueDate < endOfWeek.getTime();
      }).length;
  }, [dashboardCourses, currentDate]);

  const warnings = useMemo(() => collectDashboardWarnings(dashboardCourses), [dashboardCourses]);

  return (
    <DashboardLayout activeNav="dashboard">
      <div className="dashboard-grid">
        <section className="dashboard-content">
          <header className="dashboard-page-header">
            <div>
              <p className="dashboard-page-header__eyebrow">Academic overview</p>
              <h1>My Courses</h1>
              <p className="dashboard-page-header__subline">
                {dashboardCourses.length} courses loaded - Credits unavailable from backend
              </p>
            </div>
          </header>

          {!loading && warnings.length > 0 && (
            <div className="dashboard-warning-banner">
              {warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          )}

          {loading && (
            <div className="dashboard-state dashboard-state--loading">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading dashboard...</span>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-state dashboard-state--error">{error}</div>
          )}

          {!loading && !error && featuredCourse && (
            <>
              <FeaturedCourseCard data={featuredCourse} />

              <div className="dashboard-course-grid">
                {compactCourses.map((entry, index) => (
                  <CompactCourseCard key={entry.course.id} data={entry} index={index + 1} />
                ))}
              </div>
            </>
          )}

          {!loading && !error && dashboardCourses.length === 0 && (
            <div className="dashboard-state">
              <h2>No courses yet</h2>
              <p>
                The backend returned no courses for this user, so the dashboard has nothing to
                display yet.
              </p>
            </div>
          )}
        </section>

        <DashboardRail
          currentDate={currentDate}
          deadlines={deadlines}
          dueThisWeek={dueThisWeek}
          averageProgress={averageProgress}
          missingDueDates={missingDueDates}
        />
      </div>
    </DashboardLayout>
  );
}
