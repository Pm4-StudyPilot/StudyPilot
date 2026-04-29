import { prisma } from '../config/database';
import { AnswerDto, CreateAnswerRequest, UpdateAnswerRequest } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

export class AnswerService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    data: CreateAnswerRequest,
    questionId: string,
    ownerId: string
  ): Promise<AnswerDto | null> {
    const question = await this.db.question.findFirst({
      where: { id: questionId, quiz: { course: { ownerId } } },
    });
    if (!question) return null;

    const maxResult = await this.db.answer.aggregate({
      where: { questionId },
      _max: { position: true },
    });
    const nextPosition = (maxResult._max.position ?? -1) + 1;

    return this.db.answer.create({
      data: {
        content: data.content?.trim() ?? null,
        isCorrect: data.isCorrect,
        questionId: questionId,
        position: nextPosition,
      },
    }) as Promise<AnswerDto>;
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateAnswerRequest
  ): Promise<AnswerDto | null> {
    const existing = await this.db.answer.findFirst({
      where: { id, question: { quiz: { course: { ownerId } } } },
    });
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) updateData.content = data.content?.trim() ?? null;
    if (data.isCorrect !== undefined) updateData.isCorrect = data.isCorrect;

    return this.db.answer.update({
      where: { id },
      data: updateData,
    }) as Promise<AnswerDto>;
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<AnswerDto | null> {
    return this.db.answer.findFirst({
      where: {
        id,
        question: { quiz: { course: { ownerId } } },
      },
    }) as Promise<AnswerDto | null>;
  }

  async listByQuestion(questionId: string, ownerId: string): Promise<AnswerDto[]> {
    return this.db.answer.findMany({
      where: {
        questionId,
        question: { quiz: { course: { ownerId } } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }) as Promise<AnswerDto[]>;
  }

  async reorderAnswers(questionId: string, ownerId: string, answerIds: string[]): Promise<boolean> {
    const question = await this.db.question.findFirst({
      where: { id: questionId, quiz: { course: { ownerId } } },
    });
    if (!question) return false;

    const existingAnswers = await this.db.answer.findMany({
      where: { questionId },
      select: { id: true },
    });

    const existingIds = new Set(existingAnswers.map((a) => a.id));
    if (answerIds.length !== existingIds.size || !answerIds.every((id) => existingIds.has(id))) {
      return false;
    }

    await this.db.$transaction(
      answerIds.map((id, index) =>
        this.db.answer.update({ where: { id }, data: { position: index } })
      )
    );

    return true;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    return this.db.answer
      .deleteMany({
        where: {
          id,
          question: { quiz: { course: { ownerId } } },
        },
      })
      .then((result) => result.count > 0);
  }
}
