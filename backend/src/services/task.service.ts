import { prisma } from '../config/database';
import { TaskDto, CreateTaskRequest, UpdateTaskRequest } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

export class TaskService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    data: CreateTaskRequest,
    courseId: string,
    ownerId: string
  ): Promise<TaskDto | null> {
    const course = await this.db.course.findFirst({ where: { id: courseId, ownerId } });
    if (!course) return null;

    const maxResult = await this.db.task.aggregate({
      where: { courseId },
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
      },
    }) as Promise<TaskDto>;
  }

  async listByCourse(courseId: string, ownerId: string): Promise<TaskDto[]> {
    return this.db.task.findMany({
      where: {
        courseId,
        course: { ownerId },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }) as Promise<TaskDto[]>;
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<TaskDto | null> {
    return this.db.task.findFirst({
      where: {
        id,
        course: { ownerId },
      },
    }) as Promise<TaskDto | null>;
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateTaskRequest
  ): Promise<TaskDto | null> {
    const existing = await this.findByIdForOwner(id, ownerId);
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

  async setCompleted(id: string, ownerId: string, completed: boolean): Promise<TaskDto | null> {
    const existing = await this.findByIdForOwner(id, ownerId);
    if (!existing) return null;

    return this.db.task.update({
      where: { id },
      data: { completed },
    }) as Promise<TaskDto>;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const result = await this.db.task.deleteMany({
      where: {
        id,
        course: { ownerId },
      },
    });
    return result.count > 0;
  }
}
