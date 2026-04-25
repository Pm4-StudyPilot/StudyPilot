import { prisma } from '../config/database';
import { CreateQuestionRequest, QuestionDto, UpdateQuestionRequest } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

export class QuestionService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    data: CreateQuestionRequest,
    quizId: string,
    ownerId: string
  ): Promise<QuestionDto | null> {
    const quiz = await this.db.quiz.findFirst({ where: { id: quizId, course: { ownerId } } });
    if (!quiz) return null;

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
    ownerId: string,
    data: UpdateQuestionRequest
  ): Promise<QuestionDto | null> {
    const existing = await this.db.question.findFirst({
      where: { id, quiz: { course: { ownerId } } },
    });
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

  async findByIdForOwner(id: string, ownerId: string): Promise<QuestionDto | null> {
    return this.db.question.findFirst({
      where: {
        id,
        quiz: { course: { ownerId } },
      },
    }) as Promise<QuestionDto | null>;
  }

  async listByQuiz(quizId: string, ownerId: string): Promise<QuestionDto[]> {
    return this.db.question.findMany({
      where: {
        quizId,
        quiz: {
          course: { ownerId },
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }) as Promise<QuestionDto[]>;
  }

  async reorderQuestions(quizId: string, ownerId: string, questionIds: string[]): Promise<boolean> {
    const quiz = await this.db.quiz.findFirst({ where: { id: quizId, course: { ownerId } } });
    if (!quiz) return false;

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

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    return this.db.question
      .deleteMany({
        where: {
          id,
          quiz: { course: { ownerId } },
        },
      })
      .then((result) => result.count > 0);
  }
}
