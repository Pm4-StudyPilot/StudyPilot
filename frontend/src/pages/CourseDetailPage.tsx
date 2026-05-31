import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import DocumentUploadForm from '../components/courses/DocumentUploadForm';
import CourseDocumentsList from '../components/courses/CourseDocumentsList';
import CourseFeed, { CourseFeedItem } from '../components/courses/CourseFeed';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import CreateQuizModal from '../components/quizzes/CreateQuizModal';
import ShareCourseModal from '../components/courses/ShareCourseModal';
import TaskList from '../components/tasks/TaskList';
import ProgressRing from '../components/shared/ProgressRing';
import { api } from '../services/api';
import { CourseDto, QuizDto, TaskDto } from '../types/dto';
import { withOpacity } from '../utils/courseColors';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/useAuth';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [course, setCourse] = useState<CourseDto | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [courseFeedItems, setCourseFeedItems] = useState<CourseFeedItem[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [courseFeedLoading, setCourseFeedLoading] = useState(true);
  const [error, setError] = useState('');
  const [tasksError, setTasksError] = useState('');
  const [courseFeedError, setCourseFeedError] = useState('');
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createQuizModalOpen, setCreateQuizModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const { user } = useAuth();
  const isOwner = user?.id === course?.ownerId;

  useEffect(() => {
    if (!id) return;

    api
      .get<CourseDto>(`/courses/${id}`)
      .then(setCourse)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('courses.detail.loadFailed'));
      })
      .finally(() => setLoading(false));

    api
      .get<TaskDto[]>(`/courses/${id}/tasks`)
      .then(setTasks)
      .catch((err: unknown) => {
        setTasksError(err instanceof Error ? err.message : t('courses.detail.loadTasksFailed'));
      })
      .finally(() => setTasksLoading(false));

    api
      .get<QuizDto[]>(`/courses/${id}/quizzes`)
      .then((quizzes) => setCourseFeedItems(quizzes.map((quiz) => ({ type: 'quiz', data: quiz }))))
      .catch((err) => {
        setCourseFeedError(
          err instanceof Error ? err.message : t('courses.detail.loadMaterialsFailed')
        );
      })
      .finally(() => setCourseFeedLoading(false));
  }, [id, t]);

  function handleUploadSuccess() {
    setDocumentsRefreshKey((prev) => prev + 1);
  }

  function handleTaskCreated(task: TaskDto) {
    setTasks((prev) => [...prev, task]);
    setCreateTaskModalOpen(false);
  }

  function handleTaskUpdated(task: TaskDto) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleTasksReordered(reordered: TaskDto[]) {
    setTasks(reordered);
  }

  function handleQuizCreated(quiz: QuizDto) {
    setCourseFeedItems((prev) => [...prev, { type: 'quiz', data: quiz }]);
    setCreateQuizModalOpen(false);
  }

  const normalizedCourseSearch = courseSearchTerm.trim().toLowerCase();

  const filteredTasks = normalizedCourseSearch
    ? tasks.filter((task) => task.title.toLowerCase().includes(normalizedCourseSearch))
    : tasks;

  const filteredCourseFeedItems = normalizedCourseSearch
    ? courseFeedItems.filter((item) =>
        item.data.title.toLowerCase().includes(normalizedCourseSearch)
      )
    : courseFeedItems;

  const formattedDate = course ? formatDate(course.createdAt) : '';

  const progress = course?.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  const courseMeta = useMemo(() => {
    if (!course) return [];

    const tasksLabel = t(
      progress.totalTasks === 1 ? 'courses.detail.metaTasks' : 'courses.detail.metaTasks_other',
      { count: progress.totalTasks }
    );

    return [
      tasksLabel,
      t('courses.detail.metaCompleted', { count: progress.completedTasks }),
      t('courses.detail.metaCreated', { date: formattedDate }),
    ];
  }, [course, progress.totalTasks, progress.completedTasks, formattedDate, t]);

  return (
    <DashboardLayout
      activeNav="courses"
      showSearch
      searchValue={courseSearchTerm}
      onSearchChange={setCourseSearchTerm}
      searchPlaceholder={t('courses.detail.searchPlaceholder')}
    >
      <section className="dashboard-page-stack">
        <Link
          to="/courses"
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          {t('courses.detail.backToCourses')}
        </Link>

        {loading && (
          <div className="dashboard-state panel dashboard-state--loading">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
          </div>
        )}

        {error && <div className="dashboard-state panel dashboard-state--error">{error}</div>}

        {!loading && !error && !course && (
          <div className="dashboard-state panel">
            <h2>{t('courses.detail.courseNotFound')}</h2>
            <p>{t('courses.detail.courseNotFoundHint')}</p>
          </div>
        )}

        {!loading && !error && course && (
          <div className="course-detail">
            <div className="course-detail__hero">
              <div className="course-detail__hero-copy">
                <div className="course-detail__eyebrow">
                  <span className="course-detail__pill">{t('courses.detail.workspacePill')}</span>
                  <span className="course-detail__meta-line">{courseMeta.join(' - ')}</span>
                </div>

                <div className="course-detail__title-row">
                  <span
                    className="course-card__color-dot course-detail__color-dot"
                    style={{ backgroundColor: course.color }}
                    aria-hidden="true"
                  />
                  <h1 className="course-detail__title">{course.name}</h1>
                </div>
                {isOwner && (
                  <button className="btn btn-primary" onClick={() => setShareModalOpen(true)}>
                    <i className="fa-solid fa-share-alt me-2" />
                    {t('courses.detail.share')}
                  </button>
                )}
              </div>

              <aside
                className="course-detail__progress-card"
                style={{
                  borderColor: withOpacity(course.color, 0.24),
                  boxShadow: `inset 3px 0 0 ${course.color}`,
                }}
              >
                <div className="course-detail__progress-ring-wrap">
                  <ProgressRing
                    openTasks={progress.openTasks}
                    inProgressTasks={progress.inProgressTasks}
                    completedTasks={progress.completedTasks}
                    totalTasks={progress.totalTasks}
                    label={t('courses.detail.percentComplete', {
                      percent: progress.completionPercentage,
                    })}
                    accentColor={course.color}
                    size={148}
                  />
                  <div className="course-detail__progress-center">
                    <strong>{progress.completionPercentage}%</strong>
                    <span>{t('courses.detail.percentLabel')}</span>
                  </div>
                </div>
                <div className="course-detail__progress-summary">
                  <h2>{t('courses.detail.progressHeading')}</h2>
                  <p>
                    {t('courses.detail.progressSummary', {
                      completed: progress.completedTasks,
                      inProgress: progress.inProgressTasks,
                      open: progress.openTasks,
                    })}
                  </p>
                </div>
              </aside>
            </div>

            <div className="course-detail__body">
              <div className="course-detail__body-column">
                <section className="course-detail__tasks-column">
                  <div className="course-detail__section-header">
                    <div className="course-detail__section-title">
                      <span className="course-detail__section-accent course-detail__section-accent--primary" />
                      <h2>{t('courses.detail.tasksHeading')}</h2>
                    </div>
                    <button
                      className="course-detail__add-button btn btn-primary bold"
                      onClick={() => setCreateTaskModalOpen(true)}
                      aria-label={t('courses.detail.addTaskAria')}
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>

                  {tasksLoading && (
                    <div className="dashboard-state panel dashboard-state--loading course-detail__section-card p-4">
                      <div className="spinner-border text-secondary" role="status">
                        <span className="visually-hidden">{t('courses.detail.loadingTasks')}</span>
                      </div>
                    </div>
                  )}

                  {!tasksLoading && tasksError && (
                    <div className="dashboard-state panel dashboard-state--error course-detail__section-card">
                      {tasksError}
                    </div>
                  )}

                  {!tasksLoading && !tasksError && (
                    <div className="panel course-detail__section-card p-4">
                      <TaskList
                        courseId={id!}
                        tasks={filteredTasks}
                        onTaskUpdated={handleTaskUpdated}
                        onTaskDeleted={handleTaskDeleted}
                        onTasksReordered={handleTasksReordered}
                      />
                    </div>
                  )}
                </section>

                {courseFeedLoading && (
                  <div className="dashboard-state panel dashboard-state--loading course-detail__section-card p-4">
                    <div className="spinner-border text-secondary" role="status">
                      <span className="visually-hidden">
                        {t('courses.detail.loadingMaterials')}
                      </span>
                    </div>
                  </div>
                )}

                {!courseFeedLoading && courseFeedError && (
                  <div className="dashboard-state panel dashboard-state--error course-detail__section-card">
                    {courseFeedError}
                  </div>
                )}

                {!courseFeedLoading && !courseFeedError && (
                  <div className="course-detail__materials">
                    <div className="course-detail__section-header">
                      <div className="course-detail__section-title">
                        <span className="course-detail__section-accent course-detail__section-accent--primary" />
                        <h2>{t('courses.detail.materialsHeading')}</h2>
                      </div>
                      <button
                        className="course-detail__add-button btn btn-primary bold"
                        onClick={() => setCreateQuizModalOpen(true)}
                        aria-label={t('courses.detail.addQuizAria')}
                      >
                        <i className="fa-solid fa-plus" />
                      </button>
                    </div>
                    <CourseFeed items={filteredCourseFeedItems} />
                  </div>
                )}
              </div>

              <aside className="course-detail__documents-column">
                <div className="course-detail__section-title">
                  <span className="course-detail__section-accent course-detail__section-accent--secondary" />
                  <h2>{t('courses.detail.documentsHeading')}</h2>
                </div>

                <CourseDocumentsList
                  courseId={course.id}
                  refreshKey={documentsRefreshKey}
                  searchTerm={courseSearchTerm}
                />

                <div className="panel course-detail__upload-form p-4">
                  <div className="course-detail__upload-header">
                    <h3 className="course-detail__upload-title">
                      {t('courses.detail.uploadHeading')}
                    </h3>
                    <p className="course-detail__upload-subtitle mb-0">
                      {t('courses.detail.uploadSubtitle')}
                    </p>
                  </div>
                  <DocumentUploadForm courseId={course.id} onUploadSuccess={handleUploadSuccess} />
                </div>
              </aside>
            </div>
          </div>
        )}

        {createTaskModalOpen && id && (
          <CreateTaskModal
            courseId={id}
            onClose={() => setCreateTaskModalOpen(false)}
            onCreated={handleTaskCreated}
          />
        )}
        {createQuizModalOpen && id && (
          <CreateQuizModal
            courseId={id}
            onClose={() => setCreateQuizModalOpen(false)}
            onCreated={handleQuizCreated}
          />
        )}
        {shareModalOpen && course && (
          <ShareCourseModal course={course} onClose={() => setShareModalOpen(false)} />
        )}
      </section>
    </DashboardLayout>
  );
}
