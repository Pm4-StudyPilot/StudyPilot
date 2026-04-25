import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProgressRing from '../components/shared/ProgressRing';
import Logo from '../components/shared/Logo';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { CourseDto } from '../types/dto';

type RingVariant = 'primary' | 'secondary' | 'tertiary' | 'quaternary';

type DashboardAssignment = {
  title: string;
  meta: string;
  status: 'urgent' | 'done';
};

type DeadlineItem = {
  month: string;
  day: string;
  title: string;
  courseCode: string;
  time: string;
  variant: RingVariant;
};

const COURSE_VARIANTS: RingVariant[] = ['primary', 'secondary', 'tertiary', 'quaternary'];
const MONTH_LABELS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function buildCourseCode(course: CourseDto, index: number) {
  // TODO(backend): Replace derived dashboard course codes with a real backend field once course codes are exposed.
  const initials = course.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return `${initials || 'CR'}-${301 + index * 9}`;
}

function buildNextFocus(_course: CourseDto, index: number) {
  // TODO(backend): Replace the rotating "next focus" labels with backend-driven upcoming topic or lesson data.
  const topics = [
    'Neural architecture review',
    'Priority queue exercises',
    'Bayesian inference lab',
    'Transformer model notes',
  ];

  return topics[index % topics.length];
}

function buildFeaturedAssignments(course: CourseDto): DashboardAssignment[] {
  // TODO(backend): Replace these mock featured assignments with recent/high-priority tasks from the backend.
  const prefix = course.name.split(/\s+/).slice(0, 2).join(' ') || 'Course';

  return [
    {
      title: `${prefix} checkpoint`,
      meta: 'Due in 2 days - Project',
      status: 'urgent',
    },
    {
      title: `${prefix} quiz review`,
      meta: 'Completed - 95/100',
      status: 'done',
    },
  ];
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

function buildDeadlineItems(courses: CourseDto[], currentDate: Date): DeadlineItem[] {
  // TODO(backend): Replace derived deadline cards with real upcoming deadlines once assignments/tasks expose due-date details here.
  const defaults = [
    { title: 'Research paper draft', time: '11:59 PM' },
    { title: 'Quiz checkpoint', time: '2:00 PM' },
    { title: 'Lab worksheet', time: '5:00 PM' },
  ];

  return courses.slice(0, 3).map((course, index) => {
    const deadlineDate = new Date(currentDate);
    deadlineDate.setDate(currentDate.getDate() + index + 1);

    return {
      month: MONTH_LABELS[deadlineDate.getMonth()],
      day: String(deadlineDate.getDate()).padStart(2, '0'),
      title: `${course.name.split(':')[0]} ${defaults[index]?.title ?? 'Milestone'}`,
      courseCode: buildCourseCode(course, index),
      time: defaults[index]?.time ?? '6:00 PM',
      variant: COURSE_VARIANTS[index % COURSE_VARIANTS.length],
    };
  });
}

function DashboardSidebar({ username, onLogout }: { username: string; onLogout: () => void }) {
  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="dashboard-brand">
          <Logo className="dashboard-brand__logo" />
          {/* TODO(backend): Replace the hard-coded academic term with backend/user-specific semester data if available. */}
          <div className="dashboard-brand__meta">SPRING 2026</div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/" className="dashboard-nav__item dashboard-nav__item--active">
            <i className="fa-solid fa-table-cells-large" />
            <span>Dashboard</span>
          </Link>
          <Link to="/" className="dashboard-nav__item">
            <i className="fa-solid fa-book-open" />
            <span>Courses</span>
          </Link>
          <button type="button" className="dashboard-nav__item">
            <i className="fa-solid fa-folder-open" />
            <span>Resources</span>
          </button>
          <button type="button" className="dashboard-nav__item">
            <i className="fa-regular fa-calendar-days" />
            <span>Schedule</span>
          </button>
        </nav>
      </div>

      <div className="dashboard-sidebar__footer">
        <button type="button" className="dashboard-nav__item">
          <i className="fa-regular fa-circle-question" />
          <span>Support</span>
        </button>
        <button
          type="button"
          className="dashboard-nav__item dashboard-nav__item--logout"
          onClick={onLogout}
        >
          <i className="fa-solid fa-arrow-right-from-bracket" />
          <span>Logout</span>
        </button>
        <div className="dashboard-sidebar__username">@{username}</div>
      </div>
    </aside>
  );
}

function DashboardTopbar({ username, onSettings }: { username: string; onSettings: () => void }) {
  return (
    <header className="dashboard-topbar">
      <label className="dashboard-search" htmlFor="dashboard-search">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          id="dashboard-search"
          type="search"
          placeholder="Search for courses, notes, or deadlines..."
        />
      </label>

      <div className="dashboard-topbar__actions">
        <button type="button" className="dashboard-topbar__icon" aria-label="Notifications">
          <i className="fa-solid fa-bell" />
        </button>
        <button
          type="button"
          className="dashboard-topbar__icon"
          aria-label="Settings"
          onClick={onSettings}
        >
          <i className="fa-solid fa-gear" />
        </button>
        <div className="dashboard-topbar__divider" />
        <button type="button" className="dashboard-avatar" aria-label="Profile">
          {username.slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

function FeaturedCourseCard({
  course,
  code,
  assignments,
}: {
  course: CourseDto;
  code: string;
  assignments: DashboardAssignment[];
}) {
  const progress = course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  return (
    <article className="dashboard-featured-card">
      <div className="dashboard-featured-card__content">
        <div className="dashboard-featured-card__eyebrow">
          <span className="dashboard-pill">High Priority</span>
          <span>{code}</span>
        </div>
        <h2 className="dashboard-featured-card__title">{course.name}</h2>

        <div className="dashboard-featured-card__section-label">Recent Assignments</div>
        <div className="dashboard-featured-card__assignments">
          {assignments.map((assignment) => (
            <div
              key={assignment.title}
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
          {progress.completedTasks} / {progress.totalTasks || 0} modules done
        </p>
      </div>
    </article>
  );
}

function CompactCourseCard({ course, index }: { course: CourseDto; index: number }) {
  const progress = course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const variant = COURSE_VARIANTS[index % COURSE_VARIANTS.length];
  const code = buildCourseCode(course, index);
  const nextFocus = buildNextFocus(course, index);

  return (
    <Link to={`/courses/${course.id}`} className="dashboard-course-card">
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
        <div className="dashboard-course-card__code">{code}</div>
        <h3 className="dashboard-course-card__title">{course.name}</h3>
        <div className="dashboard-course-card__meta">Next: {nextFocus}</div>
      </div>
    </Link>
  );
}

function DashboardRail({
  currentDate,
  deadlines,
  dueThisWeek,
  averageProgress,
}: {
  currentDate: Date;
  deadlines: DeadlineItem[];
  dueThisWeek: number;
  averageProgress: number;
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
        <div className="dashboard-deadlines">
          {deadlines.map((deadline) => (
            <div key={`${deadline.title}-${deadline.day}`} className="dashboard-deadline">
              <div
                className={`dashboard-deadline__date dashboard-deadline__date--${deadline.variant}`}
              >
                <span>{deadline.month}</span>
                <strong>{deadline.day}</strong>
              </div>
              <div>
                <div className="dashboard-deadline__title">{deadline.title}</div>
                <div className="dashboard-deadline__meta">
                  {deadline.courseCode} - {deadline.time}
                </div>
              </div>
            </div>
          ))}
        </div>
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<CourseDto[]>('/courses')
      .then(setCourses)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      })
      .finally(() => setLoading(false));
  }, []);

  const currentDate = new Date();
  const username = user?.username ?? 'A';
  const featuredCourse = courses[0] ?? null;
  const compactCourses = courses.slice(1, 4);
  const totalCredits = courses.length * 6;
  const averageProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce(
            (sum, course) => sum + (course.taskProgress?.completionPercentage ?? 0),
            0
          ) / courses.length
        )
      : 0;
  const deadlines = buildDeadlineItems(courses, currentDate);
  const dueThisWeek = deadlines.length;

  function handleLogout() {
    sessionStorage.setItem('logoutMessage', 'Successfully logged out');
    logout();
    navigate('/login');
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar username={username} onLogout={handleLogout} />

      <main className="dashboard-main">
        <DashboardTopbar username={username} onSettings={() => navigate('/settings')} />

        <div className="dashboard-grid">
          <section className="dashboard-content">
            <header className="dashboard-page-header">
              <div>
                <p className="dashboard-page-header__eyebrow">Academic overview</p>
                <h1>My Courses</h1>
                <p className="dashboard-page-header__subline">
                  {/* TODO(backend): Replace the derived credit total with a real credits value from the backend when exposed. */}
                  Spring Semester 2026 - {totalCredits} Credits
                </p>
              </div>
            </header>

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
                <FeaturedCourseCard
                  course={featuredCourse}
                  code={buildCourseCode(featuredCourse, 0)}
                  assignments={buildFeaturedAssignments(featuredCourse)}
                />

                <div className="dashboard-course-grid">
                  {compactCourses.map((course, index) => (
                    <CompactCourseCard key={course.id} course={course} index={index + 1} />
                  ))}
                </div>
              </>
            )}

            {!loading && !error && courses.length === 0 && (
              <div className="dashboard-state">
                <h2>No courses yet</h2>
                <p>
                  Create your first course to populate the dashboard cards, deadlines, and progress
                  overview.
                </p>
              </div>
            )}
          </section>

          <DashboardRail
            currentDate={currentDate}
            deadlines={deadlines}
            dueThisWeek={dueThisWeek}
            averageProgress={averageProgress}
          />
        </div>
      </main>
    </div>
  );
}
