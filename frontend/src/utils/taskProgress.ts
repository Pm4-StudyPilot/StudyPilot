import { CourseTaskProgressDto, TaskDto } from '../types/dto';

export const EMPTY_TASK_PROGRESS: CourseTaskProgressDto = {
  totalTasks: 0,
  openTasks: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  completionPercentage: 0,
};

export function buildTaskProgress(tasks: Pick<TaskDto, 'status'>[]): CourseTaskProgressDto {
  const totalTasks = tasks.length;
  const openTasks = tasks.filter((task) => task.status === 'OPEN').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    openTasks,
    inProgressTasks,
    completedTasks,
    completionPercentage,
  };
}
