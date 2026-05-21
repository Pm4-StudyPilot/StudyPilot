import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import DocumentUploadForm from '../components/courses/DocumentUploadForm';
import CourseDocumentsList from '../components/courses/CourseDocumentsList';
import CourseFeed, { CourseFeedItem } from '../components/courses/CourseFeed';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import CreateQuizModal from '../components/quizzes/CreateQuizModal';
import TaskList from '../components/tasks/TaskList';
import ProgressRing from '../components/shared/ProgressRing';
import { api } from '../services/api';
import { CourseDto, QuizDto, TaskDto } from '../types/dto';

/**
 * CourseDetailPage
 *
 * Displays the workspace for a selected course.
 *
 * Includes course details, task progress, tasks, course materials,
 * documents, document upload, and a course-specific search in the
 * dashboard topbar.
 */
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();

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

  useEffect(() => {
    if (!id) return;

    api
      .get<CourseDto>(`/courses/${id}`)
      .then(setCourse)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      })
      .finally(() => setLoading(false));

    api
      .get<TaskDto[]>(`/courses/${id}/tasks`)
      .then(setTasks)
      .catch((err: unknown) => {
        setTasksError(err instanceof Error ? err.message : 'Failed to load tasks');
      })
      .finally(() => setTasksLoading(false));

    api
      .get<QuizDto[]>(`/courses/${id}/quizzes`)
      .then((quizzes) => setCourseFeedItems(quizzes.map((quiz) => ({ type: 'quiz', data: quiz }))))
      .catch((err) => {
        setCourseFeedError(err instanceof Error ? err.message : 'Failed to load course feed');
      })
      .finally(() => setCourseFeedLoading(false));
  }, [id]);

  /**
   * Triggers a document list refresh after a successful upload.
   */
  function handleUploadSuccess() {
    setDocumentsRefreshKey((prev) => prev + 1);
  }

  /**
   * Adds a newly created task to the local task list.
   */
  function handleTaskCreated(task: TaskDto) {
    setTasks((prev) => [...prev, task]);
    setCreateTaskModalOpen(false);
  }

  /**
   * Replaces an updated task in the local task list.
   */
  function handleTaskUpdated(task: TaskDto) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  /**
   * Removes a deleted task from the local task list.
   */
  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  /**
   * Updates local task order after drag-and-drop reordering.
   */
  function handleTasksReordered(reordered: TaskDto[]) {
    setTasks(reordered);
  }

  /**
   * Adds a newly created quiz to the local feed list.
   */
  function handleQuizCreated(quiz: QuizDto) {
    setCourseFeedItems((prev) => [...prev, { type: 'quiz', data: quiz }]);
    setCreateQuizModalOpen(false);
  }

  /**
   * Normalized search term used for case-insensitive filtering
   * inside the selected course.
   */
  const normalizedCourseSearch = courseSearchTerm.trim().toLowerCase();

  /**
   * Filters tasks by title using the course search term.
   */
  const filteredTasks = normalizedCourseSearch
    ? tasks.filter((task) => task.title.toLowerCase().includes(normalizedCourseSearch))
    : tasks;

  /**
   * Filters course feed items, such as quizzes, by title.
   */
  const filteredCourseFeedItems = normalizedCourseSearch
    ? courseFeedItems.filter((item) =>
        item.data.title.toLowerCase().includes(normalizedCourseSearch)
      )
    : courseFeedItems;

  /**
   * Human-readable course creation date.
   */
  const formattedDate = course
    ? new Date(course.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  /**
   * Task progress statistics for the current course.
   *
   * Falls back to empty default values
   * while the course data is still loading.
   */
  const progress = course?.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  /**
   * Metadata entries displayed inside the course overview section.
   *
   * Memoized to avoid unnecessary recalculations
   * during component re-renders.
   */
  const courseMeta = useMemo(() => {
    if (!course) return [];

    return [
      `${progress.totalTasks} task${progress.totalTasks !== 1 ? 's' : ''}`,
      `${progress.completedTasks} completed`,
      `Created ${formattedDate}`,
    ];
  }, [course, progress.totalTasks, progress.completedTasks, formattedDate]);

  return (
    <DashboardLayout
      activeNav="courses"
      showSearch
      searchValue={courseSearchTerm}
      onSearchChange={setCourseSearchTerm}
      searchPlaceholder="Search in this course..."
    >
      <section className="dashboard-page-stack">
        <Link
          to="/courses"
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to Courses
        </Link>

        {loading && (
          <div className="dashboard-state panel dashboard-state--loading">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {error && <div className="dashboard-state panel dashboard-state--error">{error}</div>}

        {!loading && !error && !course && (
          <div className="dashboard-state panel">
            <h2>Course not found</h2>
            <p>The backend did not return a course for this route.</p>
          </div>
        )}

        {!loading && !error && course && (
          <div className="course-detail">
            <div className="course-detail__hero">
              <div className="course-detail__hero-copy">
                <div className="course-detail__eyebrow">
                  <span className="course-detail__pill">Course workspace</span>
                  <span className="course-detail__meta-line">{courseMeta.join(' - ')}</span>
                </div>

                <h1 className="course-detail__title">{course.name}</h1>
              </div>

              <aside className="course-detail__progress-card">
                <div className="course-detail__progress-ring-wrap">
                  <ProgressRing
                    openTasks={progress.openTasks}
                    inProgressTasks={progress.inProgressTasks}
                    completedTasks={progress.completedTasks}
                    totalTasks={progress.totalTasks}
                    label={`${progress.completionPercentage}% complete`}
                    variant="primary"
                    size={148}
                  />
                  <div className="course-detail__progress-center">
                    <strong>{progress.completionPercentage}%</strong>
                    <span>complete</span>
                  </div>
                </div>
                <div className="course-detail__progress-summary">
                  <h2>Course Progress</h2>
                  <p>
                    {progress.completedTasks} completed, {progress.inProgressTasks} in progress,{' '}
                    {progress.openTasks} open
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
                      <h2>Tasks</h2>
                    </div>
                    <button
                      className="course-detail__add-button btn btn-primary bold"
                      onClick={() => setCreateTaskModalOpen(true)}
                      aria-label="Add task"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>

                  {tasksLoading && (
                    <div className="dashboard-state panel dashboard-state--loading course-detail__section-card p-4">
                      <div className="spinner-border text-secondary" role="status">
                        <span className="visually-hidden">Loading tasks...</span>
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
                      <span className="visually-hidden">Loading course materials...</span>
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
                        <h2>Course Materials</h2>
                      </div>
                      <button
                        className="course-detail__add-button btn btn-primary bold"
                        onClick={() => setCreateQuizModalOpen(true)}
                        aria-label="Add quiz"
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
                  <h2>Course Documents</h2>
                </div>

                <CourseDocumentsList
                  courseId={course.id}
                  refreshKey={documentsRefreshKey}
                  searchTerm={courseSearchTerm}
                />

                <div className="panel course-detail__upload-form p-4">
                  <div className="course-detail__upload-header">
                    <h3 className="course-detail__upload-title">Upload Document</h3>
                    <p className="course-detail__upload-subtitle mb-0">
                      Add files to this course workspace. The document list above refreshes after a
                      successful upload.
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
      </section>
    </DashboardLayout>
  );
}
