import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/shared/layout/Navbar';
import DocumentUploadForm from '../components/courses/DocumentUploadForm';
import CourseDocumentsList from '../components/courses/CourseDocumentsList';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskList from '../components/tasks/TaskList';
import CourseFeed, { CourseFeedItem } from '../components/courses/CourseFeed';
import { api } from '../services/api';
import { CourseDto, QuizDto, TaskDto } from '../types/dto';

/**
 * CourseDetailPage
 *
 * Displays detailed information about a single course identified by its UUID in the URL.
 *
 * Responsibilities:
 * - Extract the course UUID from the URL params
 * - Fetch the selected course from the backend API
 * - Fetch tasks linked to the course
 * - Render course details including name and creation date
 * - Provide tab-based navigation between documents and tasks
 * - Handle loading, not-found, and error states
 *
 * Tabs:
 * - Documents: shows uploaded documents and the upload form
 * - Tasks: shows the task list and allows creating new tasks
 *
 * Workflow:
 * 1. UUID is read from /courses/:id via useParams
 * 2. GET /courses/:id is called on mount
 * 3. GET /courses/:id/tasks is called on mount
 * 4. The user can switch between the Documents and Tasks tabs
 * 5. A back link returns the user to the home page
 */
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Core course data
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'documents' | 'tasks'>('documents');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Refresh and modal state
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courseFeedItems, setCourseFeedItems] = useState<CourseFeedItem[]>([]);

  useEffect(() => {
    if (!id) return;

    // Load the selected course details
    api
      .get<CourseDto>(`/courses/${id}`)
      .then(setCourse)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      })
      .finally(() => setLoading(false));

    // Load tasks linked to the selected course
    api
      .get<TaskDto[]>(`/courses/${id}/tasks`)
      .then(setTasks)
      .catch(() => {});

    api
      .get<QuizDto[]>(`/courses/${id}/quizzes`)
      .then((quizzes) => setCourseFeedItems(quizzes.map((quiz) => ({ type: 'quiz', data: quiz }))))
      .catch(() => {});
  }, [id]);

  /**
   * Triggers a refresh of the document list after a successful upload.
   */
  function handleUploadSuccess() {
    setDocumentsRefreshKey((prev) => prev + 1);
  }

  /**
   * Adds a newly created task to the local task state
   * and closes the create-task modal.
   */
  function handleTaskCreated(task: TaskDto) {
    setTasks((prev) => [...prev, task]);
    setCreateModalOpen(false);
  }

  /**
   * Replaces an existing task in local state after an edit.
   */
  function handleTaskUpdated(task: TaskDto) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  /**
   * Removes a deleted task from local state.
   */
  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  /**
   * Updates the local task order after drag-and-drop reordering.
   */
  function handleTasksReordered(reordered: TaskDto[]) {
    setTasks(reordered);
  }

  /**
   * Formats the course creation date for display in the header.
   * Returns an empty string until the course data has been loaded.
   */
  const formattedDate = course
    ? new Date(course.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  /**
   * Renders the Documents tab content.
   *
   * This tab contains:
   * - the list of uploaded course documents
   * - the upload form for adding new documents
   */
  function renderDocumentsTab() {
    if (!course) return null;

    return (
      <div className="row g-4">
        <div className="col-lg-7">
          <CourseDocumentsList courseId={course.id} refreshKey={documentsRefreshKey} />
        </div>

        <div className="col-lg-5">
          <DocumentUploadForm
            courseId={course.id}
            courseName={course.name}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      </div>
    );
  }

  /**
   * Renders the Tasks tab content.
   *
   * This tab contains:
   * - the button for creating a new task
   * - an empty state if no tasks exist
   * - the task list with update, delete, and reorder functionality
   */
  function renderTasksTab() {
    return (
      <>
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-primary btn-sm" onClick={() => setCreateModalOpen(true)}>
            + New Task
          </button>
        </div>

        {tasks.length === 0 && (
          <div className="course-detail__placeholder rounded p-3 text-secondary text-center mb-3">
            No tasks yet. Add one to get started.
          </div>
        )}

        <TaskList
          courseId={id!}
          tasks={tasks}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          onTasksReordered={handleTasksReordered}
        />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        {/* Navigation back to the course overview */}
        <Link
          to="/"
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2 mb-4"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to My Courses
        </Link>

        {/* Loading state */}
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && <div className="course-detail__error alert alert-danger">{error}</div>}

        {/* Empty / not found state */}
        {!loading && !error && !course && <p className="text-secondary">Course not found.</p>}

        {/* Main course content */}
        {!loading && !error && course && (
          <div className="course-panel rounded p-4">
            {/* Course header */}
            <div className="d-flex align-items-center justify-content-between mb-1">
              <h2 className="text-white fw-bold mb-0">{course.name}</h2>
            </div>

            <p className="course-detail__date text-secondary mb-4">Added {formattedDate}</p>

            {/* Tab navigation */}
            <div className="d-flex gap-2 mb-4 border-bottom pb-2">
              <button
                type="button"
                className={`btn btn-sm ${
                  activeTab === 'documents' ? 'btn-primary' : 'btn-outline-secondary'
                }`}
                onClick={() => setActiveTab('documents')}
              >
                Documents
              </button>

              <button
                type="button"
                className={`btn btn-sm ${
                  activeTab === 'tasks' ? 'btn-primary' : 'btn-outline-secondary'
                }`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>
            </div>

            {/* Active tab content */}
            {activeTab === 'documents' ? renderDocumentsTab() : renderTasksTab()}

            <div className="course-detail__coursefeed mt-4">
              <CourseFeed items={courseFeedItems} />
            </div>
          </div>
        )}

        {/* Create-task modal */}
        {createModalOpen && id && (
          <CreateTaskModal
            courseId={id}
            onClose={() => setCreateModalOpen(false)}
            onCreated={handleTaskCreated}
          />
        )}
      </div>
    </>
  );
}
