import { prisma } from '../config/database';
import { QuizDto, CreateQuizRequest, UpdateQuizRequest } from '../types';
import { CourseShareService } from './course-share.service';
import type { PrismaClient } from '../generated/prisma/client';

export class QuizService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly courseShareService = new CourseShareService()
  ) {}

  async create(data: CreateQuizRequest, courseId: string, userId: string): Promise<QuizDto | null> {
    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(courseId, userId);
    if (!hasAccess) return null;

    return this.db.quiz.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        isOrderRandom: data.isOrderRandom ?? false,
        courseId,
      },
    }) as Promise<QuizDto>;
  }

  async listByCourse(courseId: string, userId: string): Promise<QuizDto[]> {
    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(courseId, userId);
    if (!hasAccess) return [];

    return this.db.quiz.findMany({
      where: {
        courseId,
      },
      orderBy: [{ createdAt: 'asc' }],
    }) as Promise<QuizDto[]>;
  }

  async findByIdForOwner(id: string, userId: string): Promise<QuizDto | null> {
    const quiz = await this.db.quiz.findFirst({
      where: { id },
      include: { course: true },
    });
    if (!quiz) return null;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(quiz.courseId, userId);
    return hasAccess ? (quiz as QuizDto) : null;
  }

  async updateForOwner(
    id: string,
    userId: string,
    data: UpdateQuizRequest
  ): Promise<QuizDto | null> {
    const existing = await this.findByIdForOwner(id, userId);
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

  async deleteForOwner(id: string, userId: string): Promise<boolean> {
    const quiz = await this.db.quiz.findFirst({
      where: { id },
      include: { course: true },
    });
    if (!quiz) return false;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(quiz.courseId, userId);
    if (!hasAccess) return false;

    const result = await this.db.quiz.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
