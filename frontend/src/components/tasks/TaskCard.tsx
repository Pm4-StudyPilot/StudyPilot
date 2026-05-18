import { useState } from 'react';
import { TaskDto } from '../../types/dto';

interface TaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
}

const PRIORITY_BADGE: Record<TaskDto['priority'], string> = {
  LOW: 'bg-secondary',
  MEDIUM: 'bg-warning text-dark',
  HIGH: 'bg-danger',
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

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className={`task-card rounded p-3 mb-2${isDragging ? ' opacity-50' : ''}`}>
      <div className="d-flex align-items-center gap-2">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="task-card__drag-handle text-secondary"
            aria-label="drag handle"
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
          <span className={`task-card__priority badge ${PRIORITY_BADGE[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`task-card__status badge ${STATUS_BADGE[task.status]}`}>
            {STATUS_LABEL[task.status]}
          </span>
          <button
            className="btn btn-link p-0 text-secondary"
            onClick={() => onEdit(task)}
            aria-label="edit task"
          >
            <i className="fa-solid fa-pen-to-square" />
          </button>
          <button
            className="btn btn-link p-0 text-secondary"
            onClick={() => onDelete(task)}
            aria-label="delete task"
          >
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="task-card__description mt-2 pt-2 text-secondary">
          {task.description ?? <em>No description.</em>}
        </div>
      )}
    </div>
  );
}
