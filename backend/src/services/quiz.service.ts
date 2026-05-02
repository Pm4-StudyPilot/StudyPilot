import { prisma } from '../config/database';
import { QuizDto, CreateQuizRequest, UpdateQuizRequest } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

export class QuizService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    data: CreateQuizRequest,
    courseId: string,
    ownerId: string
  ): Promise<QuizDto | null> {
    const course = await this.db.course.findFirst({ where: { id: courseId, ownerId } });
    if (!course) return null;

    return this.db.quiz.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        isOrderRandom: data.isOrderRandom ?? false,
        courseId,
      },
    }) as Promise<QuizDto>;
  }

  async listByCourse(courseId: string, ownerId: string): Promise<QuizDto[]> {
    return this.db.quiz.findMany({
      where: {
        courseId,
        course: { ownerId },
      },
      orderBy: [{ createdAt: 'asc' }],
    }) as Promise<QuizDto[]>;
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<QuizDto | null> {
    return this.db.quiz.findFirst({
      where: {
        id,
        course: { ownerId },
      },
    }) as Promise<QuizDto | null>;
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateQuizRequest
  ): Promise<QuizDto | null> {
    const existing = await this.findByIdForOwner(id, ownerId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if ('description' in data) updateData.description = data.description?.trim() ?? null;
    if (data.isOrderRandom !== undefined) updateData.isOrderRandom = data.isOrderRandom;

    return this.db.quiz.update({
      where: { id },
      data: updateData,
    }) as Promise<QuizDto>;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const result = await this.db.quiz.deleteMany({
      where: {
        id,
        course: { ownerId },
      },
    });
    return result.count > 0;
  }
}
