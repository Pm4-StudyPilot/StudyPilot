import { Role } from '../generated/prisma/enums';

// --- Internal types ---

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: Role;
}

// --- Request DTOs ---

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface CreateCourseRequest {
  name: string;
}

export interface UpdateCourseRequest {
  name: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  email: string;
  username: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  isOrderRandom?: boolean;
}

export interface UpdateQuizRequest {
  title?: string;
  description?: string | null;
  isOrderRandom?: boolean;
}

export interface CreateQuestionRequest {
  title: string;
  description?: string;
  type: QuestionType;
}

export interface UpdateQuestionRequest {
  title?: string;
  description?: string | null;
  type?: QuestionType;
}

export interface ReorderQuestionsRequest {
  order: string[];
}

export interface CreateAnswerRequest {
  content: string;
  isCorrect: boolean;
}

export interface UpdateAnswerRequest {
  content?: string | null;
  isCorrect?: boolean;
}

export interface ReorderAnswersRequest {
  order: string[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface PatchTaskCompletionRequest {
  completed: boolean;
}

export interface ReorderTasksRequest {
  order: string[];
}

// --- Response DTOs ---

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

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  completed: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizDto {
  id: string;
  title: string;
  description: string | null;
  isOrderRandom: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'CARD';

export interface QuestionDto {
  id: string;
  title: string;
  description: string;
  position: number;
  type: QuestionType;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnswerDto {
  id: string;
  content: string;
  isCorrect: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  taskProgress: CourseTaskProgressDto;
}

export interface CourseTaskProgressDto {
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  completionPercentage: number;
}

// --- Object Storage ---

export interface ObjectMetadata {
  contentType?: string;
  size?: number;
  lastModified?: Date;
  [key: string]: string | number | Date | undefined;
}

export interface ObjectEntry {
  key: string;
  size?: number;
  lastModified?: Date;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}
