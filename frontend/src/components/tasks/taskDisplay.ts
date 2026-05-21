import type { TaskDto } from '../../types/dto';

export const TASK_PRIORITY_BADGE_CLASS: Record<TaskDto['priority'], string> = {
  LOW: 'bg-secondary',
  MEDIUM: 'bg-warning text-dark',
  HIGH: 'bg-danger',
};

export const TASK_STATUS_BADGE_CLASS: Record<TaskDto['status'], string> = {
  OPEN: 'bg-secondary',
  IN_PROGRESS: 'bg-primary',
  DONE: 'bg-success',
};

export const TASK_STATUS_LABEL: Record<TaskDto['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};
