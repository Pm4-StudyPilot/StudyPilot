import { prisma } from '../config/database';
import { TaskDto, CreateTaskRequest, UpdateTaskRequest } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

export class TaskService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(data: CreateTaskRequest, courseId: string, userId: string): Promise<TaskDto | null> {
    // Verify user has access to the course (owner or shared)
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) return null;

    // Check if user is owner or has shared access
    const hasAccess =
      course.ownerId === userId ||
      (await this.db.courseShare.findFirst({
        where: { courseId, sharedWithUserId: userId },
      })) !== null;

    if (!hasAccess) return null;

    const maxResult = await this.db.task.aggregate({
      where: { courseId, userId },
      _max: { position: true },
    });
    const nextPosition = (maxResult._max.position ?? -1) + 1;

    return this.db.task.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority ?? 'MEDIUM',
        status: 'OPEN',
        position: nextPosition,
        courseId,
        userId,
      },
    }) as Promise<TaskDto>;
  }

  async listByCourse(courseId: string, userId: string): Promise<TaskDto[]> {
    return this.db.task.findMany({
      where: {
        courseId,
        userId,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }) as Promise<TaskDto[]>;
  }

  async findByIdForUser(id: string, userId: string): Promise<TaskDto | null> {
    return this.db.task.findFirst({
      where: {
        id,
        userId,
      },
    }) as Promise<TaskDto | null>;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateTaskRequest
  ): Promise<TaskDto | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if ('description' in data) updateData.description = data.description?.trim() ?? null;
    if ('dueDate' in data) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;

    return this.db.task.update({
      where: { id },
      data: updateData,
    }) as Promise<TaskDto>;
  }

  async setCompleted(id: string, userId: string, completed: boolean): Promise<TaskDto | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;

    return this.db.task.update({
      where: { id },
      data: { completed },
    }) as Promise<TaskDto>;
  }

  async reorderTasks(courseId: string, userId: string, taskIds: string[]): Promise<boolean> {
    // Verify user has access to course
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) return false;

    const hasAccess =
      course.ownerId === userId ||
      (await this.db.courseShare.findFirst({
        where: { courseId, sharedWithUserId: userId },
      })) !== null;

    if (!hasAccess) return false;

    const existingTasks = await this.db.task.findMany({
      where: { courseId, userId },
      select: { id: true },
    });

    const existingIds = new Set(existingTasks.map((t) => t.id));
    if (taskIds.length !== existingIds.size || !taskIds.every((id) => existingIds.has(id))) {
      return false;
    }

    await this.db.$transaction(
      taskIds.map((id, index) => this.db.task.update({ where: { id }, data: { position: index } }))
    );

    return true;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.db.task.deleteMany({
      where: {
        id,
        userId,
      },
    });
    return result.count > 0;
  }

  // Backward compatibility aliases
  async findByIdForOwner(id: string, userId: string): Promise<TaskDto | null> {
    return this.findByIdForUser(id, userId);
  }

  async updateForOwner(
    id: string,
    userId: string,
    data: UpdateTaskRequest
  ): Promise<TaskDto | null> {
    return this.updateForUser(id, userId, data);
  }

  async deleteForOwner(id: string, userId: string): Promise<boolean> {
    return this.deleteForUser(id, userId);
  }
}
