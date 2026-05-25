import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { TaskDto } from '../../types/dto';
import { api } from '../../services/api';
import TaskCard from './TaskCard';
import EditTaskModal from './EditTaskModal';
import DeleteTaskModal from './DeleteTaskModal';

type SortField = 'manual' | 'title' | 'dueDate' | 'priority' | 'status';

interface TaskListProps {
  courseId: string;
  tasks: TaskDto[];
  onTaskUpdated: (task: TaskDto) => void;
  onTaskDeleted: (id: string) => void;
  onTasksReordered: (tasks: TaskDto[]) => void;
}

const PRIORITY_ORDER: Record<TaskDto['priority'], number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const STATUS_ORDER: Record<TaskDto['status'], number> = { OPEN: 0, IN_PROGRESS: 1, DONE: 2 };

const SORT_FIELDS: SortField[] = ['manual', 'title', 'dueDate', 'priority', 'status'];

function sortTasks(tasks: TaskDto[], field: SortField): TaskDto[] {
  if (field === 'manual') return tasks;
  return [...tasks].sort((a, b) => {
    switch (field) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case 'priority':
        return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      default:
        return 0;
    }
  });
}

interface SortableTaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
}

function SortableTaskCard({ task, onEdit, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

export default function TaskList({
  courseId,
  tasks,
  onTaskUpdated,
  onTaskDeleted,
  onTasksReordered,
}: TaskListProps) {
  const [sortField, setSortField] = useState<SortField>('manual');
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDto | null>(null);
  const [reorderError, setReorderError] = useState('');
  const { t } = useTranslation();

  const sensors = useSensors(useSensor(PointerSensor));
  const displayedTasks = sortTasks(tasks, sortField);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex).map((task, index) => ({
      ...task,
      position: index,
    }));

    onTasksReordered(reordered);
    setReorderError('');

    try {
      await api.patch<void>(`/courses/${courseId}/tasks/order`, {
        order: reordered.map((t) => t.id),
      });
    } catch {
      onTasksReordered(tasks);
      setReorderError(t('tasks.list.reorderError'));
    }
  }

  function handleTaskUpdated(task: TaskDto) {
    onTaskUpdated(task);
    setEditingTask(null);
  }

  function handleTaskDeleted(id: string) {
    onTaskDeleted(id);
    setDeletingTask(null);
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list__empty rounded p-3 text-secondary text-center">
        {t('tasks.list.empty')}
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="task-list__label text-secondary">{t('tasks.list.sortBy')}</span>
        {SORT_FIELDS.map((field) => (
          <button
            key={field}
            className={`btn btn-sm ${sortField === field ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setSortField(field)}
          >
            {t(`tasks.list.sortLabels.${field}`)}
          </button>
        ))}
      </div>

      {sortField !== 'manual' && (
        <div className="task-list__sorted-alert alert alert-secondary py-1 px-3 mb-3 d-flex align-items-center justify-content-between">
          <span>
            <Trans
              i18nKey="tasks.list.sortedBy"
              values={{ label: t(`tasks.list.sortLabels.${sortField}`) }}
              components={{ strong: <strong /> }}
            />
          </span>
          <button
            className="btn btn-link btn-sm p-0 text-secondary"
            onClick={() => setSortField('manual')}
          >
            {t('tasks.list.switchToManual')}
          </button>
        </div>
      )}

      {reorderError && (
        <div className="task-list__error alert alert-danger py-2 mb-3">{reorderError}</div>
      )}

      {sortField === 'manual' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayedTasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={setEditingTask}
                onDelete={setDeletingTask}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        displayedTasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={setEditingTask} onDelete={setDeletingTask} />
        ))
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}

      {deletingTask && (
        <DeleteTaskModal
          task={deletingTask}
          onClose={() => setDeletingTask(null)}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
}
