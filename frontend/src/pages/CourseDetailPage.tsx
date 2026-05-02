import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import DocumentUploadForm from '../components/courses/DocumentUploadForm';
import CourseDocumentsList from '../components/courses/CourseDocumentsList';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskList from '../components/tasks/TaskList';
import ProgressRing from '../components/shared/ProgressRing';
import { api } from '../services/api';
import { CourseDto, TaskDto } from '../types/dto';

/**
 * CourseDetailPage
 *
 * Displays detailed information about a single course identified by its UUID in the URL.
 *
 * Responsibilities:
 * - Extract the course UUID from the URL params
 * - Fetch the course from the backend API
 * - Render course details including name and creation date
 * - Handle loading, not-found, and error states
 *
 * Workflow:
 * 1. UUID is read from /courses/:id via useParams
 * 2. GET /courses/:id is called on mount
 * 3. Course details are displayed on success
 * 4. A back link returns the user to the home page
 */
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');

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
  }, [id]);

  function handleUploadSuccess() {
    setDocumentsRefreshKey((prev) => prev + 1);
  }

  function handleTaskCreated(task: TaskDto) {
    setTasks((prev) => [...prev, task]);
    setCreateModalOpen(false);
  }

  function handleTaskUpdated(task: TaskDto) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  function handleTaskDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleTasksReordered(reordered: TaskDto[]) {
    setTasks(reordered);
  }

  // Only compute the formatted date once the course has loaded
  const formattedDate = course
    ? new Date(course.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const progress = course?.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };
  const courseMeta = useMemo(() => {
    if (!course) return [];

    return [
      `${progress.totalTasks} task${progress.totalTasks !== 1 ? 's' : ''}`,
      `${progress.completedTasks} completed`,
      `Created ${formattedDate}`,
    ];
  }, [course, progress.totalTasks, progress.completedTasks, formattedDate]);

  return (
    <DashboardLayout activeNav="courses">
      <section className="dashboard-page-stack">
        <Link
          to="/courses"
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to Courses
        </Link>

        {loading && (
          <div className="dashboard-state dashboard-state--loading">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {error && <div className="dashboard-state dashboard-state--error">{error}</div>}

        {!loading && !error && !course && (
          <div className="dashboard-state">
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

                <div className="course-detail__support-note">
                  <div className="course-detail__support-label">Backend data available</div>
                  <p className="mb-0">
                    This page currently shows real course, task progress, task list, and document
                    data from the backend. Instructor and course description are not available from
                    the API yet.
                  </p>
                </div>
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
              <section className="course-detail__tasks-column">
                <div className="course-detail__section-header">
                  <div className="course-detail__section-title">
                    <span className="course-detail__section-accent course-detail__section-accent--primary" />
                    <h2>Tasks</h2>
                  </div>
                  <button
                    className="course-detail__add-button btn btn-primary"
                    onClick={() => setCreateModalOpen(true)}
                    aria-label="Add task"
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                </div>

                {tasksLoading && (
                  <div className="dashboard-state dashboard-state--loading course-detail__section-card">
                    <div className="spinner-border text-secondary" role="status">
                      <span className="visually-hidden">Loading tasks...</span>
                    </div>
                  </div>
                )}

                {!tasksLoading && tasksError && (
                  <div className="dashboard-state dashboard-state--error course-detail__section-card">
                    {tasksError}
                  </div>
                )}

                {!tasksLoading && !tasksError && (
                  <div className="course-detail__section-card">
                    <TaskList
                      courseId={id!}
                      tasks={tasks}
                      onTaskUpdated={handleTaskUpdated}
                      onTaskDeleted={handleTaskDeleted}
                      onTasksReordered={handleTasksReordered}
                    />
                  </div>
                )}
              </section>

              <aside className="course-detail__documents-column">
                <div className="course-detail__section-title">
                  <span className="course-detail__section-accent course-detail__section-accent--secondary" />
                  <h2>Course Documents</h2>
                </div>

                <CourseDocumentsList courseId={course.id} refreshKey={documentsRefreshKey} />

                <DocumentUploadForm
                  courseId={course.id}
                  courseName={course.name}
                  onUploadSuccess={handleUploadSuccess}
                />
              </aside>
            </div>
          </div>
        )}

        {createModalOpen && id && (
          <CreateTaskModal
            courseId={id}
            onClose={() => setCreateModalOpen(false)}
            onCreated={handleTaskCreated}
          />
        )}
      </section>
    </DashboardLayout>
  );
}
