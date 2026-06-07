import { prisma } from '../config/database';
import { AnswerDto, CreateAnswerRequest, UpdateAnswerRequest } from '../types';
import { CourseShareService } from './course-share.service';
import type { PrismaClient } from '../generated/prisma/client';

export class AnswerService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly courseShareService = new CourseShareService()
  ) {}

  async create(
    data: CreateAnswerRequest,
    questionId: string,
    userId: string
  ): Promise<AnswerDto | null> {
    const question = await this.db.question.findFirst({
      where: { id: questionId },
      include: { quiz: { include: { course: true } } },
    });
    if (!question) return null;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(question.quiz.courseId, userId);
    if (!hasAccess) return null;

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
    userId: string,
    data: UpdateAnswerRequest
  ): Promise<AnswerDto | null> {
    const existing = await this.findByIdForOwner(id, userId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) updateData.content = data.content?.trim() ?? null;
    if (data.isCorrect !== undefined) updateData.isCorrect = data.isCorrect;

    return this.db.answer.update({
      where: { id },
      data: updateData,
    }) as Promise<AnswerDto>;
  }

  async findByIdForOwner(id: string, userId: string): Promise<AnswerDto | null> {
    const answer = await this.db.answer.findFirst({
      where: { id },
      include: { question: { include: { quiz: { include: { course: true } } } } },
    });
    if (!answer) return null;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(
      answer.question.quiz.courseId,
      userId
    );
    return hasAccess ? (answer as AnswerDto) : null;
  }

  async listByQuestion(questionId: string, userId: string): Promise<AnswerDto[]> {
    const question = await this.db.question.findFirst({
      where: { id: questionId },
      include: { quiz: { include: { course: true } } },
    });
    if (!question) return [];

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(question.quiz.courseId, userId);
    if (!hasAccess) return [];

    return this.db.answer.findMany({
      where: { questionId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    }) as Promise<AnswerDto[]>;
  }

  async reorderAnswers(questionId: string, userId: string, answerIds: string[]): Promise<boolean> {
    const question = await this.db.question.findFirst({
      where: { id: questionId },
      include: { quiz: { include: { course: true } } },
    });
    if (!question) return false;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(question.quiz.courseId, userId);
    if (!hasAccess) return false;

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

  async deleteForOwner(id: string, userId: string): Promise<boolean> {
    const answer = await this.db.answer.findFirst({
      where: { id },
      include: { question: { include: { quiz: { include: { course: true } } } } },
    });
    if (!answer) return false;

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(
      answer.question.quiz.courseId,
      userId
    );
    if (!hasAccess) return false;

    return this.db.answer
      .deleteMany({
        where: { id },
      })
      .then((result) => result.count > 0);
  }
}
