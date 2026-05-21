import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DeadlineCalendar from '../components/calendar/DeadlineCalendar';
import ProgressRing from '../components/shared/ProgressRing';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import { api } from '../services/api';
import { CourseDto, TaskDto } from '../types/dto';

type RingVariant = 'primary' | 'secondary' | 'tertiary' | 'quaternary';

type DashboardAssignment = {
  id: string;
  title: string;
  meta: string;
  status: 'urgent' | 'done';
};

type DashboardSearchMatch = {
  id: string;
  title: string;
  meta: string;
  type: 'task' | 'document' | 'quiz';
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

const COURSE_VARIANTS: RingVariant[] = ['primary', 'secondary', 'tertiary', 'quaternary'];

/**
 * Returns a visual progress variant based on the course index.
 */
function getVariant(index: number): RingVariant {
  return COURSE_VARIANTS[index % COURSE_VARIANTS.length];
}

/**
 * Formats a task due date as a short month/day label.
 */
function formatShortDate(value: string | null) {
  if (!value) return 'No due date';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Creates the small metadata line shown below a dashboard assignment.
 */
function createTaskMeta(task: TaskDto) {
  if (task.status === 'DONE') {
    return `Completed - ${task.priority.toLowerCase()} priority`;
  }

  if (task.dueDate) {
    return `Due ${formatShortDate(task.dueDate)} - ${task.priority.toLowerCase()} priority`;
  }

  return `${task.status.replace('_', ' ').toLowerCase()} - ${task.priority.toLowerCase()} priority`;
}

/**
 * Selects the most relevant assignments for the featured course card.
 */
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

/**
 * Builds the support text shown on compact course cards.
 */
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

/**
 * Builds visible search result items for the featured dashboard card.
 *
 * The dashboard search can match tasks, documents, and quizzes.
 * These matches are shown instead of the normal assignment preview
 * while a search term is active.
 */
function getDashboardMatches(
  data: DashboardCourseData,
  searchTerm: string
): DashboardSearchMatch[] {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return [];

  const taskMatches = data.tasks
    .filter((task) => task.title.toLowerCase().includes(normalized))
    .map((task) => ({
      id: task.id,
      title: task.title,
      meta: 'Task',
      type: 'task' as const,
    }));

  const documentMatches = data.documents
    .filter(
      (document) =>
        document.filename.toLowerCase().includes(normalized) ||
        document.fileType?.toLowerCase().includes(normalized)
    )
    .map((document) => ({
      id: document.id,
      title: document.filename,
      meta: 'Document',
      type: 'document' as const,
    }));

  const quizMatches = data.quizzes
    .filter((quiz) => quiz.title.toLowerCase().includes(normalized))
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      meta: 'Quiz',
      type: 'quiz' as const,
    }));

  return [...taskMatches, ...documentMatches, ...quizMatches].slice(0, 2);
}

/**
 * Collects warning messages when supporting dashboard data could not be loaded.
 */
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

/**
 * Loads tasks, documents, and quizzes for every course displayed on the dashboard.
 */
async function loadDashboardCourseData(courses: CourseDto[]) {
  const results = await Promise.all(
    courses.map(async (course) => {
      const [tasksResult, documentsResult, quizzesResult] = await Promise.allSettled([
        api.get<TaskDto[]>(`/courses/${course.id}/tasks`),
        api.get<DocumentDto[]>(`/documents/course/${course.id}?sort=createdAt:desc`),
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

/**
 * Renders the large highlighted course card on the dashboard.
 */
function FeaturedCourseCard({
  data,
  searchTerm = '',
}: {
  data: DashboardCourseData;
  searchTerm?: string;
}) {
  const progress = data.course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const searchMatches = getDashboardMatches(data, searchTerm);
  const assignments =
    searchMatches.length > 0 ? searchMatches : buildFeaturedAssignments(data.tasks);

  const quizSummary =
    data.quizzes.length > 0
      ? `${data.quizzes.length} quiz${data.quizzes.length !== 1 ? 'zes' : ''} available`
      : 'No quizzes available';

  const sectionLabel = searchTerm.trim() ? 'Search Results' : 'Recent Assignments';

  return (
    <Link to={`/courses/${data.course.id}`} className="dashboard-featured-card card">
      <div className="dashboard-featured-card__content">
        <div className="dashboard-featured-card__eyebrow">
          <span className="dashboard-pill">
            {progress.openTasks > 0 ? 'Action Needed' : 'On Track'}
          </span>
          <span>{quizSummary}</span>
        </div>
        {/* TODO: Check with Nadine if the whole card being clickable is necessary for the search feature */}
        <h2 className="dashboard-featured-card__title">{data.course.name}</h2>
        <div className="dashboard-featured-card__section-label">{sectionLabel}</div>
        {assignments.length > 0 ? (
          <div className="dashboard-featured-card__assignments">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="dashboard-assignment dashboard-assignment--urgent"
              >
                <div>
                  <div className="dashboard-assignment__title">{assignment.title}</div>
                  <div className="dashboard-assignment__meta">{assignment.meta}</div>
                </div>
                <i className="fa-solid fa-angle-right" />
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
    </Link>
  );
}

/**
 * Renders a compact course card for the dashboard course grid.
 */
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

/**
 * Renders the right dashboard rail with calendar, deadlines, and stats.
 */
function DashboardRail({
  courses,
  coursesLoading,
  coursesError,
  tasksByCourseId,
  dueThisWeek,
  averageProgress,
}: {
  courses: CourseDto[];
  coursesLoading: boolean;
  coursesError: string;
  tasksByCourseId: Record<string, TaskDto[]>;
  dueThisWeek: number;
  averageProgress: number;
}) {
  return (
    <aside className="dashboard-rail">
      <section className="dashboard-rail__panel card dark">
        <DeadlineCalendar
          courses={courses}
          coursesLoading={coursesLoading}
          coursesError={coursesError}
          tasksByCourseId={tasksByCourseId}
        />
      </section>

      <div className="dashboard-stats">
        <div className="dashboard-stat-card card light">
          <strong>{dueThisWeek}</strong>
          <span>Due this week</span>
        </div>
        <div className="dashboard-stat-card card light dashboard-stat-card--highlight">
          <strong>{averageProgress}%</strong>
          <span>Avg progress</span>
        </div>
      </div>
    </aside>
  );
}

/**
 * HomePage
 *
 * Displays the dashboard overview with course cards, upcoming deadlines,
 * progress statistics, and a local dashboard search.
 */
export default function HomePage() {
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Current dashboard search input value.
   */
  const [dashboardSearchTerm, setDashboardSearchTerm] = useState('');

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

  /**
   * Current date used for calendar and deadline calculations.
   */
  const currentDate = useMemo(() => new Date(), []);

  /**
   * Normalized dashboard search term used for case-insensitive filtering.
   */
  const normalizedDashboardSearch = dashboardSearchTerm.trim().toLowerCase();

  /**
   * Filters dashboard courses by course name, task title,
   * quiz title, document filename, or document file type.
   */
  const filteredDashboardCourses = normalizedDashboardSearch
    ? dashboardCourses.filter((entry) => {
        const courseMatches = entry.course.name.toLowerCase().includes(normalizedDashboardSearch);

        const taskMatches = entry.tasks.some((task) =>
          task.title.toLowerCase().includes(normalizedDashboardSearch)
        );

        const quizMatches = entry.quizzes.some((quiz) =>
          quiz.title.toLowerCase().includes(normalizedDashboardSearch)
        );

        const documentMatches = entry.documents.some(
          (document) =>
            document.filename.toLowerCase().includes(normalizedDashboardSearch) ||
            document.fileType?.toLowerCase().includes(normalizedDashboardSearch)
        );

        return courseMatches || taskMatches || quizMatches || documentMatches;
      })
    : dashboardCourses;

  /**
   * First matching course shown as featured course.
   */
  const featuredCourse = filteredDashboardCourses[0] ?? null;

  /**
   * Additional matching courses shown in the compact course grid.
   */
  const compactCourses = filteredDashboardCourses.slice(1, 4);

  /**
   * Average progress based on all dashboard courses.
   */
  const averageProgress =
    dashboardCourses.length > 0
      ? Math.round(
          dashboardCourses.reduce(
            (sum, entry) => sum + (entry.course.taskProgress?.completionPercentage ?? 0),
            0
          ) / dashboardCourses.length
        )
      : 0;

  const tasksByCourseId = useMemo(
    () =>
      dashboardCourses.reduce<Record<string, TaskDto[]>>((grouped, entry) => {
        grouped[entry.course.id] = entry.tasks;
        return grouped;
      }, {}),
    [dashboardCourses]
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

  /**
   * Renders the dashboard page.
   */
  return (
    <DashboardLayout
      activeNav="dashboard"
      showSearch
      searchValue={dashboardSearchTerm}
      onSearchChange={setDashboardSearchTerm}
      searchPlaceholder="Search dashboard..."
    >
      <div className="dashboard-grid">
        <section className="dashboard-content">
          <header className="dashboard-page-header">
            <div>
              <p className="dashboard-page-header__eyebrow">Academic overview</p>
              <h1>My Courses</h1>
              {!loading && !error && dashboardCourses.length > 0 && (
                <p className="dashboard-page-header__eyebrow">
                  {filteredDashboardCourses.length} of {dashboardCourses.length} course
                  {dashboardCourses.length !== 1 ? 's' : ''} shown
                </p>
              )}
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
            <div className="dashboard-state panel dashboard-state--loading">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading dashboard...</span>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-state panel dashboard-state--error">{error}</div>
          )}

          {!loading && !error && featuredCourse && (
            <>
              <FeaturedCourseCard data={featuredCourse} searchTerm={dashboardSearchTerm} />

              <div className="dashboard-course-grid">
                {compactCourses.map((entry, index) => (
                  <CompactCourseCard key={entry.course.id} data={entry} index={index + 1} />
                ))}
              </div>
            </>
          )}

          {!loading &&
            !error &&
            dashboardCourses.length > 0 &&
            filteredDashboardCourses.length === 0 && (
              <div className="dashboard-state">
                <h2>No dashboard results</h2>
                <p>No courses, tasks, quizzes, or documents match your search.</p>
              </div>
            )}

          {!loading && !error && dashboardCourses.length === 0 && (
            <div className="dashboard-state panel">
              <h2>No courses yet</h2>
              <p>
                The backend returned no courses for this user, so the dashboard has nothing to
                display yet.
              </p>
            </div>
          )}
        </section>

        <DashboardRail
          courses={dashboardCourses.map((entry) => entry.course)}
          coursesLoading={loading}
          coursesError={error}
          tasksByCourseId={tasksByCourseId}
          dueThisWeek={dueThisWeek}
          averageProgress={averageProgress}
        />
      </div>
    </DashboardLayout>
  );
}
