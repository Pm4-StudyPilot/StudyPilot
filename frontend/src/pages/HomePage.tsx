import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import DeadlineCalendar from '../components/calendar/DeadlineCalendar';
import ProgressRing from '../components/shared/ProgressRing';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import { api } from '../services/api';
import { CourseDto, TaskDto } from '../types/dto';
import { formatDate } from '../utils/formatDate';
import { getRecentCourseIds } from '../utils/recentCourses';

/**
 * How many recently visited courses to display in the dashboard's
 * "Recent courses" section.
 */
const RECENT_COURSES_LIMIT = 3;

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

function formatTaskStatus(status: TaskDto['status'], t: TFunction): string {
  return t(`tasks.status.${status}`);
}

function formatTaskPriority(priority: TaskDto['priority'], t: TFunction): string {
  return t(`tasks.priority.${priority}`);
}

function createTaskMeta(task: TaskDto, t: TFunction): string {
  const priority = formatTaskPriority(task.priority, t).toLowerCase();

  if (task.status === 'DONE') {
    return t('home.completedPriority', { priority });
  }

  if (task.dueDate) {
    return t('home.duePriority', { date: formatDate(task.dueDate), priority });
  }

  return t('home.statusPriority', {
    status: formatTaskStatus(task.status, t).toLowerCase(),
    priority,
  });
}

/**
 * Selects the two most-relevant upcoming tasks for a course:
 * not-done tasks first (sorted by due date), then done tasks.
 * Used inside the featured (most-recently-visited) course card.
 */
function buildFeaturedAssignments(tasks: TaskDto[], t: TFunction): DashboardAssignment[] {
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
      meta: createTaskMeta(task, t),
      status: task.status === 'DONE' ? 'done' : 'urgent',
    }));
}

function buildCourseSupportMeta(data: DashboardCourseData, t: TFunction): string {
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
    return t('home.nextTask', { title: nextTask.title });
  }

  if (data.quizzes.length > 0) {
    return t('home.quizAvailable', { title: data.quizzes[0].title });
  }

  if (data.documents.length > 0) {
    return t('home.documentUploaded', { filename: data.documents[0].filename });
  }

  if (data.taskError || data.quizError || data.documentError) {
    return t('home.supportLoadFail');
  }

  return t('home.noSupportContent');
}

function collectDashboardWarnings(data: DashboardCourseData[], t: TFunction): string[] {
  const warnings = new Set<string>();

  if (data.some((entry) => entry.taskError)) {
    warnings.add(t('home.tasksWarning'));
  }

  if (data.some((entry) => entry.quizError)) {
    warnings.add(t('home.quizzesWarning'));
  }

  if (data.some((entry) => entry.documentError)) {
    warnings.add(t('home.documentsWarning'));
  }

  return [...warnings];
}

function getSettledErrorMessage(result: PromiseSettledResult<unknown>, fallback: string) {
  if (result.status !== 'rejected') return undefined;

  return result.reason instanceof Error ? result.reason.message : fallback;
}

async function loadDashboardCourseData(courses: CourseDto[], t: TFunction) {
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
        taskError: getSettledErrorMessage(tasksResult, t('home.errors.loadTasks')),
        documentError: getSettledErrorMessage(documentsResult, t('home.errors.loadDocuments')),
        quizError: getSettledErrorMessage(quizzesResult, t('home.errors.loadQuizzes')),
      } satisfies DashboardCourseData;
    })
  );

  return results;
}

/**
 * The featured card highlights one course (the most recently visited).
 * It surfaces the course's progress ring and its two most-urgent tasks
 * inline so the user can jump straight into work without opening the
 * course detail page first.
 */
function FeaturedCourseCard({ data }: { data: DashboardCourseData }) {
  const { t } = useTranslation();
  const progress = data.course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const assignments = buildFeaturedAssignments(data.tasks, t);

  const quizSummary =
    data.quizzes.length > 0
      ? t(data.quizzes.length === 1 ? 'home.quizCount' : 'home.quizCount_other', {
          count: data.quizzes.length,
        })
      : t('home.quizCountZero');

  return (
    <Link
      to={`/courses/${data.course.id}`}
      className="dashboard-featured-card card"
      aria-label={data.course.name}
    >
      <div className="dashboard-featured-card__content">
        <div className="dashboard-featured-card__eyebrow">
          <span className="dashboard-pill">
            {progress.openTasks > 0 ? t('home.actionNeeded') : t('home.onTrack')}
          </span>
          <span>{quizSummary}</span>
        </div>
        <h2 className="dashboard-featured-card__title">{data.course.name}</h2>
        <div className="dashboard-featured-card__section-label">{t('home.recentAssignments')}</div>
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
              ? t('home.tasksUnavailable', { error: data.taskError })
              : t('home.noTaskData')}
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
            label={t('home.percentComplete', { percent: progress.completionPercentage })}
            accentColor={data.course.color}
            size={152}
            className="dashboard-featured-card__ring"
          />
          <div className="dashboard-featured-card__ring-center">
            <strong>{progress.completionPercentage}%</strong>
            <span>{t('home.percentOverall')}</span>
          </div>
        </div>

        <p className="dashboard-featured-card__summary">
          {t('home.tasksCompleted', {
            completed: progress.completedTasks,
            total: progress.totalTasks || 0,
          })}
        </p>
      </div>
    </Link>
  );
}

function CompactCourseCard({ data }: { data: DashboardCourseData }) {
  const { t } = useTranslation();
  const progress = data.course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const quizLabel =
    data.quizzes.length > 0
      ? t(data.quizzes.length === 1 ? 'home.quizCountShort' : 'home.quizCountShort_other', {
          count: data.quizzes.length,
        })
      : t('home.noQuizzesShort');

  return (
    <Link
      to={`/courses/${data.course.id}`}
      className="dashboard-course-card card light"
      aria-label={data.course.name}
    >
      <div className="dashboard-course-card__ring-wrap">
        <ProgressRing
          openTasks={progress.openTasks}
          inProgressTasks={progress.inProgressTasks}
          completedTasks={progress.completedTasks}
          totalTasks={progress.totalTasks}
          label={t('home.percentComplete', { percent: progress.completionPercentage })}
          accentColor={data.course.color}
          size={96}
        />
        <div className="dashboard-course-card__ring-center">{progress.completionPercentage}%</div>
      </div>

      <div className="dashboard-course-card__body">
        <div className="dashboard-course-card__code">{quizLabel}</div>
        <h3 className="dashboard-course-card__title">{data.course.name}</h3>
        <div className="dashboard-course-card__meta">{buildCourseSupportMeta(data, t)}</div>
      </div>
    </Link>
  );
}

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
  const { t } = useTranslation();
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
          <span>{t('home.dueThisWeek')}</span>
        </div>
        <div className="dashboard-stat-card card light dashboard-stat-card--highlight">
          <strong>{averageProgress}%</strong>
          <span>{t('home.avgProgress')}</span>
        </div>
      </div>
    </aside>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dashboardSearchTerm, setDashboardSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const courses = await api.get<CourseDto[]>('/courses');
        const data = await loadDashboardCourseData(courses, t);

        if (cancelled) return;
        setDashboardCourses(data);
        setError('');
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('home.loadingFailed'));
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
  }, [t]);

  const currentDate = useMemo(() => new Date(), []);

  const normalizedDashboardSearch = dashboardSearchTerm.trim().toLowerCase();

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
   * Recently visited courses, in visit order, capped at RECENT_COURSES_LIMIT
   * and intersected with the courses we actually have data for (in case the
   * user visited a course that has since been deleted).
   *
   * The localStorage read happens inside the memo so it reruns whenever the
   * loaded course set changes — which is the same moment we'd want to surface
   * a freshly-visited course on remount.
   */
  const recentDashboardCourses = useMemo(() => {
    const recentCourseIds = getRecentCourseIds();
    const byId = new Map(dashboardCourses.map((entry) => [entry.course.id, entry]));
    const ordered: DashboardCourseData[] = [];

    for (const id of recentCourseIds) {
      const entry = byId.get(id);
      if (entry) ordered.push(entry);
      if (ordered.length >= RECENT_COURSES_LIMIT) break;
    }

    return ordered;
  }, [dashboardCourses]);

  // While searching, show all matching courses. Otherwise show the recent set.
  const visibleCourses = normalizedDashboardSearch
    ? filteredDashboardCourses
    : recentDashboardCourses;

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

  const warnings = useMemo(
    () => collectDashboardWarnings(dashboardCourses, t),
    [dashboardCourses, t]
  );

  const totalCourses = dashboardCourses.length;
  const shownCourses = filteredDashboardCourses.length;
  const coursesShown =
    totalCourses === 1
      ? t('home.courseShown', { shown: shownCourses, total: totalCourses })
      : t('home.coursesShown', { shown: shownCourses, total: totalCourses });

  return (
    <DashboardLayout
      activeNav="dashboard"
      showSearch
      searchValue={dashboardSearchTerm}
      onSearchChange={setDashboardSearchTerm}
      searchPlaceholder={t('common.search.dashboard')}
    >
      <div className="dashboard-grid">
        <section className="dashboard-content">
          <header className="dashboard-page-header">
            <div>
              <p className="dashboard-page-header__eyebrow">{t('home.eyebrow')}</p>
              <h1>{t('home.title')}</h1>
              {!loading && !error && dashboardCourses.length > 0 && (
                <p className="dashboard-page-header__eyebrow">{coursesShown}</p>
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
                <span className="visually-hidden">{t('home.loading')}</span>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-state panel dashboard-state--error">{error}</div>
          )}

          {!loading && !error && dashboardCourses.length > 0 && (
            <section
              className="dashboard-recent-courses"
              aria-labelledby="dashboard-recent-heading"
            >
              <h2 id="dashboard-recent-heading" className="dashboard-recent-courses__title">
                {normalizedDashboardSearch
                  ? t('home.searchResultsHeading')
                  : t('home.recentCoursesHeading')}
              </h2>

              {visibleCourses.length > 0 && (
                <>
                  <FeaturedCourseCard data={visibleCourses[0]} />

                  {visibleCourses.length > 1 && (
                    <div className="dashboard-course-grid">
                      {visibleCourses.slice(1).map((entry) => (
                        <CompactCourseCard key={entry.course.id} data={entry} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {visibleCourses.length === 0 && normalizedDashboardSearch && (
                <div className="dashboard-state">
                  <h2>{t('home.noResults')}</h2>
                  <p>{t('home.noResultsHint')}</p>
                </div>
              )}

              {visibleCourses.length === 0 && !normalizedDashboardSearch && (
                <div className="dashboard-state panel">
                  <p className="mb-0">{t('home.noRecentCourses')}</p>
                </div>
              )}
            </section>
          )}

          {!loading && !error && dashboardCourses.length === 0 && (
            <div className="dashboard-state panel">
              <h2>{t('home.noCoursesYet')}</h2>
              <p>{t('home.noCoursesHint')}</p>
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
