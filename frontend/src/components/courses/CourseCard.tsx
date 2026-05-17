import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseDto, TaskDto } from '../../types/dto';
import { api } from '../../services/api';
import EditCourseModal from './EditCourseModal';
import DeleteCourseModal from './DeleteCourseModal';
import ProgressRing from '../shared/ProgressRing';
import { withOpacity } from '../../utils/courseColors';
import CreateTaskModal from '../tasks/CreateTaskModal';

type CourseCardProps = {
  course: CourseDto;
  onUpdated: (course: CourseDto) => void;
  onDeleted: (id: string) => void;
};

const EMPTY_TASK_PROGRESS: NonNullable<CourseDto['taskProgress']> = {
  totalTasks: 0,
  completedTasks: 0,
  openTasks: 0,
  inProgressTasks: 0,
  completionPercentage: 0,
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

function getTaskProgressAfterCreate(
  currentProgress: CourseDto['taskProgress'],
  task: TaskDto
): NonNullable<CourseDto['taskProgress']> {
  const progress = currentProgress ?? EMPTY_TASK_PROGRESS;
  const normalizedStatus =
    task.completed || task.status === 'DONE'
      ? 'DONE'
      : task.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : 'OPEN';

  const nextProgress = {
    totalTasks: progress.totalTasks + 1,
    openTasks: progress.openTasks + (normalizedStatus === 'OPEN' ? 1 : 0),
    inProgressTasks: progress.inProgressTasks + (normalizedStatus === 'IN_PROGRESS' ? 1 : 0),
    completedTasks: progress.completedTasks + (normalizedStatus === 'DONE' ? 1 : 0),
  };

  return {
    ...nextProgress,
    completionPercentage:
      nextProgress.totalTasks === 0
        ? 0
        : Math.round((nextProgress.completedTasks / nextProgress.totalTasks) * 100),
  };
}

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
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const progress = course.taskProgress ?? EMPTY_TASK_PROGRESS;

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

  function handleTaskCreated(task: TaskDto) {
    setTasks((previousTasks) => (previousTasks ? [...previousTasks, task] : [task]));
    onUpdated({
      ...course,
      taskProgress: getTaskProgressAfterCreate(course.taskProgress, task),
    });
    setCreateTaskOpen(false);
  }

  const courseAccentStyle = {
    borderColor: withOpacity(course.color, 0.2),
    boxShadow: `inset 3px 0 0 ${course.color}`,
  };

  return (
    <>
      <div className="course-card rounded mb-2" style={courseAccentStyle}>
        <div className="d-flex align-items-center justify-content-between p-3">
          <div className="d-flex align-items-center gap-3">
            <ProgressRing
              openTasks={progress.openTasks}
              inProgressTasks={progress.inProgressTasks}
              completedTasks={progress.completedTasks}
              totalTasks={progress.totalTasks}
              className="course-card__progress-ring flex-shrink-0"
              label={`${progress.openTasks} open, ${progress.inProgressTasks} in progress, ${progress.completedTasks} completed`}
            />
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span
                  className="course-card__color-dot"
                  style={{ backgroundColor: course.color }}
                  aria-hidden="true"
                />
                <Link
                  to={`/courses/${course.id}`}
                  className="course-card__name fw-semibold text-white text-decoration-none"
                >
                  {course.name}
                </Link>
              </div>
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

            {!tasksLoading && tasks !== null && (
              <div className="course-card__tasks-panel rounded-4 p-3">
                <div className="course-card__tasks-toolbar d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                  <div>
                    <p className="course-card__section-label mb-1">Tasks</p>
                    <p className="course-card__section-caption text-secondary mb-0">
                      Create tasks here to track progress and deadline badges from the dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setCreateTaskOpen(true)}
                  >
                    + Add task
                  </button>
                </div>

                {tasks.length === 0 && (
                  <div className="course-card__empty-state rounded-4 p-3 text-center">
                    <p className="course-card__empty text-secondary mb-3">
                      No tasks yet. Create the first task for this course to start tracking
                      deadlines.
                    </p>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setCreateTaskOpen(true)}
                      >
                        Add first task
                      </button>
                      <Link
                        to={`/courses/${course.id}`}
                        className="btn btn-sm btn-outline-secondary text-decoration-none"
                      >
                        Open course
                      </Link>
                    </div>
                  </div>
                )}

                {tasks.length > 0 && (
                  <>
                    <ul className="list-unstyled mb-3">
                      {tasks.map((task) => (
                        <li
                          key={task.id}
                          className="d-flex align-items-center justify-content-between py-2"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <span className="text-white" style={{ fontSize: '0.9rem' }}>
                            {task.title}
                          </span>
                          <div className="d-flex align-items-center gap-2">
                            {task.dueDate && (
                              <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                                {new Date(task.dueDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                            <span
                              className={`badge ${STATUS_BADGE[task.status]}`}
                              style={{ fontSize: '0.68rem' }}
                            >
                              {STATUS_LABEL[task.status]}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={`/courses/${course.id}`}
                      className="course-card__view-link text-decoration-none"
                      style={{ fontSize: '0.82rem', color: course.color }}
                    >
                      View all tasks →
                    </Link>
                  </>
                )}
              </div>
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

      {createTaskOpen && (
        <CreateTaskModal
          courseId={course.id}
          onClose={() => setCreateTaskOpen(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </>
  );
}
