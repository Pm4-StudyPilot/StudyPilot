import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseDto, TaskDto } from '../../types/dto';
import { api } from '../../services/api';
import EditCourseModal from './EditCourseModal';
import DeleteCourseModal from './DeleteCourseModal';
import ProgressRing from '../shared/ProgressRing';

type CourseCardProps = {
  course: CourseDto;
  onUpdated: (course: CourseDto) => void;
  onDeleted: (id: string) => void;
};

const STATUS_BADGE: Record<TaskDto['status'], string> = {
  OPEN: 'bg-secondary',
  IN_PROGRESS: 'bg-primary',
  DONE: 'bg-success',
};

const STATUS_LABEL: Record<TaskDto['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

/**
 * CourseCard
 *
 * Renders a single course as a collapsible card row inside the course list.
 *
 * Responsibilities:
 * - Display the course name as a link to the detail page
 * - Show the formatted creation date
 * - Toggle expanded state to reveal course content
 * - Open the EditCourseModal and notify the parent when the course is updated
 * - Open the DeleteCourseModal and notify the parent when the course is deleted
 *
 * Workflow:
 * 1. Course data is received via props
 * 2. Clicking the header row toggles the expanded state
 * 3. Clicking the course name navigates to /courses/:id without toggling
 * 4. Clicking the edit button opens the EditCourseModal
 * 5. Clicking the delete button opens the DeleteCourseModal
 */
export default function CourseCard({ course, onUpdated, onDeleted }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const progress = course.taskProgress ?? {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    inProgressTasks: 0,
    completionPercentage: 0,
  };

  function handleToggle() {
    setExpanded((prev) => {
      if (!prev && tasks === null) {
        setTasksLoading(true);
        api
          .get<TaskDto[]>(`/courses/${course.id}/tasks`)
          .then(setTasks)
          .catch(() => setTasks([]))
          .finally(() => setTasksLoading(false));
      }
      return !prev;
    });
  }

  const formattedDate = new Date(course.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function handleUpdated(updated: CourseDto) {
    onUpdated(updated);
    setEditOpen(false);
  }

  return (
    <>
      <div className="course-card rounded mb-2">
        <div className="d-flex align-items-center justify-content-between p-3">
          <div className="d-flex align-items-center gap-3">
            <ProgressRing
              openTasks={progress.openTasks}
              inProgressTasks={progress.inProgressTasks}
              completedTasks={progress.completedTasks}
              totalTasks={progress.totalTasks}
              variant="primary"
              className="course-card__progress-ring flex-shrink-0"
              label={`${progress.openTasks} open, ${progress.inProgressTasks} in progress, ${progress.completedTasks} completed`}
            />
            <div>
              <Link
                to={`/courses/${course.id}`}
                className="course-card__name fw-semibold text-white text-decoration-none"
              >
                {course.name}
              </Link>
              <div className="course-card__date text-secondary">Added {formattedDate}</div>
              <div className="course-card__progress-text text-secondary">
                {progress.openTasks} open · {progress.inProgressTasks} in progress ·{' '}
                {progress.completedTasks} completed
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-link text-secondary p-0"
              onClick={() => setEditOpen(true)}
              aria-label="Edit course"
            >
              <i className="fa-solid fa-pen-to-square" />
            </button>
            <button
              className="btn btn-sm btn-link text-danger p-0"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete course"
            >
              <i className="fa-solid fa-trash" />
            </button>
            <button
              className="btn btn-sm btn-link text-secondary p-0"
              onClick={handleToggle}
              aria-label="Toggle course"
              aria-expanded={expanded}
            >
              <i
                className={`course-card__chevron fa-solid fa-chevron-${expanded ? 'up' : 'down'}`}
              />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-3">
            {tasksLoading && (
              <div className="d-flex justify-content-center py-2">
                <div className="spinner-border spinner-border-sm text-secondary" role="status">
                  <span className="visually-hidden">Loading tasks...</span>
                </div>
              </div>
            )}

            {!tasksLoading && tasks !== null && tasks.length === 0 && (
              <p className="course-card__empty text-secondary mb-0">No tasks yet.</p>
            )}

            {!tasksLoading && tasks !== null && tasks.length > 0 && (
              <>
                <ul className="list-unstyled mb-2">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="course-card__task d-flex align-items-center justify-content-between py-1"
                    >
                      <span className="course-card__task-title text-white">{task.title}</span>
                      <div className="d-flex align-items-center gap-2">
                        {task.dueDate && (
                          <span className="course-card__task-date text-secondary">
                            {new Date(task.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        <span
                          className={`course-card__task-status badge ${STATUS_BADGE[task.status]}`}
                        >
                          {STATUS_LABEL[task.status]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/courses/${course.id}`}
                  className="course-card__tasks-link text-secondary text-decoration-none"
                >
                  View all tasks →
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {editOpen && (
        <EditCourseModal
          course={course}
          onClose={() => setEditOpen(false)}
          onUpdated={handleUpdated}
        />
      )}

      {deleteOpen && (
        <DeleteCourseModal
          course={course}
          onClose={() => setDeleteOpen(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}
