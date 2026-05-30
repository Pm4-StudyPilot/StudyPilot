import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskDto } from '../../types/dto';
import { TASK_PRIORITY_BADGE_CLASS, TASK_STATUS_BADGE_CLASS } from './taskDisplay';
import { formatDate } from '../../utils/formatDate';

interface TaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
}

/**
 * TaskCard
 *
 * Displays a single task with its key fields and an expand/collapse toggle
 * for the description. Accepts optional drag handle props for manual reordering.
 *
 * Responsibilities:
 * - Render title, due date, priority, and status
 * - Toggle description visibility on click
 * - Expose edit and delete actions to the parent
 * - Render a drag handle when dragHandleProps are provided
 */
export default function TaskCard({
  task,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const formattedDueDate = task.dueDate ? formatDate(task.dueDate) : null;

  return (
    <div
      className={`task-card rounded p-3 mb-2${isDragging ? ' opacity-50' : ''}`}
      data-testid="task-card"
    >
      <div className="d-flex align-items-center gap-2">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="task-card__drag-handle text-secondary"
            aria-label={t('tasks.card.dragHandleAria')}
            data-testid="task-drag-handle"
          >
            <i className="fa-solid fa-grip-vertical" />
          </span>
        )}

        <button
          className="task-card__toggle btn btn-link p-0 text-start text-white flex-grow-1 text-decoration-none"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <i
            className={`task-card__chevron fa-solid fa-chevron-${expanded ? 'down' : 'right'} me-2 text-secondary`}
          />
          <span className="fw-semibold">{task.title}</span>
        </button>

        <div className="d-flex align-items-center gap-2 ms-auto">
          {formattedDueDate && (
            <span className="task-card__due-date text-secondary">
              <i className="fa-regular fa-calendar me-1" />
              {formattedDueDate}
            </span>
          )}
          <span className={`task-card__priority badge ${TASK_PRIORITY_BADGE_CLASS[task.priority]}`}>
            {t(`tasks.priority.${task.priority}`)}
          </span>
          <span className={`task-card__status badge ${TASK_STATUS_BADGE_CLASS[task.status]}`}>
            {t(`tasks.status.${task.status}`)}
          </span>
          <button
            className="btn btn-link p-0 text-secondary"
            onClick={() => onEdit(task)}
            aria-label={t('tasks.card.editAria')}
            data-testid="task-edit-button"
          >
            <i className="fa-solid fa-pen-to-square" />
          </button>
          <button
            className="btn btn-link p-0 text-secondary"
            onClick={() => onDelete(task)}
            aria-label={t('tasks.card.deleteAria')}
            data-testid="task-delete-button"
          >
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="task-card__description mt-2 pt-2 text-secondary">
          {task.description ?? <em>{t('tasks.card.noDescription')}</em>}
        </div>
      )}
    </div>
  );
}
