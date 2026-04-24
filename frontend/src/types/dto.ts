export interface UserDto {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
}

export interface UpdateProfileDto {
  username: string;
  email: string;
}

export interface CourseDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  taskProgress?: CourseTaskProgressDto;
}

export interface CourseTaskProgressDto {
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  completionPercentage: number;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  completed: boolean;
  courseId: string;
  createdAt: string;
  updatedAt: string;
}
