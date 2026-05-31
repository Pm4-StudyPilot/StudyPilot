import { prisma } from '../config/database';
import {
  CreateQuestionRequest,
  QuestionDto,
  QuestionWithAnswersDto,
  UpdateQuestionRequest,
} from '../types';
import { CourseShareService } from './course-share.service';
import type { PrismaClient } from '../generated/prisma/client';

export class QuestionService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly courseShareService = new CourseShareService()
  ) {}

  async create(
    data: CreateQuestionRequest,
    quizId: string,
    userId: string
  ): Promise<QuestionDto | null> {
    const quiz = await this.db.quiz.findFirst({ where: { id: quizId }, include: { course: true } });
    if (!quiz) return null;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(quiz.courseId, userId);
    if (!hasAccess) return null;

    const maxResult = await this.db.question.aggregate({
      where: { quizId },
      _max: { position: true },
    });
    const nextPosition = (maxResult._max.position ?? -1) + 1;

    return this.db.question.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        type: data.type,
        position: nextPosition,
        quizId: quizId,
      },
    }) as Promise<QuestionDto>;
  }

  async updateForOwner(
    id: string,
    userId: string,
    data: UpdateQuestionRequest
  ): Promise<QuestionDto | null> {
    const existing = await this.findByIdForOwner(id, userId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if ('description' in data) updateData.description = data.description?.trim() ?? null;
    if (data.type !== undefined) updateData.type = data.type;

    return this.db.question.update({
      where: { id },
      data: updateData,
    }) as Promise<QuestionDto>;
  }

  async findByIdForOwner(id: string, userId: string): Promise<QuestionDto | null> {
    const question = await this.db.question.findFirst({
      where: { id },
      include: { quiz: { include: { course: true } } },
    });
    if (!question) return null;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(question.quiz.courseId, userId);
    return hasAccess ? (question as QuestionDto) : null;
  }

  async listByQuiz(quizId: string, userId: string): Promise<QuestionWithAnswersDto[]> {
    // Get quiz to find course ID
    const quiz = await this.db.quiz.findFirst({ where: { id: quizId } });
    if (!quiz) return [];

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(quiz.courseId, userId);
    if (!hasAccess) return [];

    return this.db.question.findMany({
      where: {
        quizId,
      },
      include: {
        answers: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }) as Promise<QuestionWithAnswersDto[]>;
  }

  async reorderQuestions(quizId: string, userId: string, questionIds: string[]): Promise<boolean> {
    const quiz = await this.db.quiz.findFirst({ where: { id: quizId }, include: { course: true } });
    if (!quiz) return false;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(quiz.courseId, userId);
    if (!hasAccess) return false;

    const existingQuestions = await this.db.question.findMany({
      where: { quizId },
      select: { id: true },
    });

    const existingIds = new Set(existingQuestions.map((q) => q.id));
    if (
      questionIds.length !== existingIds.size ||
      !questionIds.every((id) => existingIds.has(id))
    ) {
      return false;
    }

    await this.db.$transaction(
      questionIds.map((id, index) =>
        this.db.question.update({ where: { id }, data: { position: index } })
      )
    );

    return true;
  }

  async deleteForOwner(id: string, userId: string): Promise<boolean> {
    const question = await this.db.question.findFirst({
      where: { id },
      include: { quiz: { include: { course: true } } },
    });
    if (!question) return false;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(question.quiz.courseId, userId);
    if (!hasAccess) return false;

    return this.db.question
      .deleteMany({
        where: { id },
      })
      .then((result) => result.count > 0);
  }
}
