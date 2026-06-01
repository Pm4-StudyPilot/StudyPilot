import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CourseDto, TaskDto } from '../../types/dto';
import { api } from '../../services/api';
import EditCourseModal from './EditCourseModal';
import DeleteCourseModal from './DeleteCourseModal';
import ProgressRing from '../shared/ProgressRing';
import { withOpacity } from '../../utils/courseColors';
import { formatDate } from '../../utils/formatDate';

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

export default function CourseCard({ course, onUpdated, onDeleted }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const { t } = useTranslation();
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

  const formattedDate = formatDate(course.createdAt);

  function handleUpdated(updated: CourseDto) {
    onUpdated(updated);
    setEditOpen(false);
  }

  const courseAccentStyle = {
    '--course-accent-color': course.color,
    '--course-accent-border-color': withOpacity(course.color, 0.2),
  };

  return (
    <>
      <div
        className="course-card panel mb-2"
        style={courseAccentStyle as CSSProperties}
        data-testid="course-card"
      >
        <Link
          to={`/courses/${course.id}`}
          className="course-card__link-overlay"
          aria-label={t('courses.card.openAria')}
        />
        <div className="d-flex align-items-center justify-content-between p-3">
          <div className="d-flex align-items-center gap-3">
            <ProgressRing
              openTasks={progress.openTasks}
              inProgressTasks={progress.inProgressTasks}
              completedTasks={progress.completedTasks}
              totalTasks={progress.totalTasks}
              accentColor={course.color}
              className="course-card__progress-ring flex-shrink-0"
              label={t('courses.card.progressLabel', {
                open: progress.openTasks,
                inProgress: progress.inProgressTasks,
                completed: progress.completedTasks,
              })}
            />
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <Link
                  to={`/courses/${course.id}`}
                  className="course-card__name fw-semibold text-decoration-none"
                >
                  {course.name}
                </Link>
              </div>
              <div className="course-card__date">
                {t('courses.card.addedDate', { date: formattedDate })}
              </div>
              <div className="course-card__progress-text">
                {t('courses.card.progressText', {
                  open: progress.openTasks,
                  inProgress: progress.inProgressTasks,
                  completed: progress.completedTasks,
                })}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-link text-secondary p-0 course-card__action"
              onClick={() => setEditOpen(true)}
              aria-label={t('courses.card.editAria')}
              data-testid="course-edit-button"
            >
              <i className="fa-solid fa-pen-to-square" />
            </button>
            <button
              className="btn btn-sm btn-link text-danger p-0 course-card__action"
              onClick={() => setDeleteOpen(true)}
              aria-label={t('courses.card.deleteAria')}
              data-testid="course-delete-button"
            >
              <i className="fa-solid fa-trash" />
            </button>
            <button
              className="btn btn-sm btn-link text-secondary p-0 course-card__action"
              onClick={handleToggle}
              aria-label={t('courses.card.toggleAria')}
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
                  <span className="visually-hidden">{t('courses.card.loadingTasks')}</span>
                </div>
              </div>
            )}

            {!tasksLoading && tasks !== null && tasks.length === 0 && (
              <p className="course-card__empty mb-0">{t('courses.card.noTasks')}</p>
            )}

            {!tasksLoading && tasks !== null && tasks.length > 0 && (
              <>
                <ul className="list-unstyled mb-2">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="course-card__task d-flex align-items-center justify-content-between py-1"
                    >
                      <span className="course-card__task-title">{task.title}</span>
                      <div className="d-flex align-items-center gap-2">
                        {task.dueDate && (
                          <span className="course-card__task-date">{formatDate(task.dueDate)}</span>
                        )}
                        <span
                          className={`course-card__task-status badge ${STATUS_BADGE[task.status]}`}
                        >
                          {t(`courses.card.status.${task.status}`)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/courses/${course.id}`}
                  className="course-card__tasks-link text-decoration-none course-card__foreground"
                >
                  {t('courses.card.viewAllTasks')}
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
