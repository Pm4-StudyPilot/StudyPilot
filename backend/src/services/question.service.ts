import { prisma } from '../config/database';
import {
  CreateQuestionRequest,
  CreateQuestionWithAnswersRequest,
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

  /**
   * Creates many questions (each with its answers) for a quiz in a single
   * transaction. Used by the agent's quiz generator to persist a whole quiz at
   * once. Throws on validation failure; returns `null` when the user has no
   * access to the quiz's course.
   */
  async createManyWithAnswers(
    quizId: string,
    userId: string,
    questions: CreateQuestionWithAnswersRequest[]
  ): Promise<QuestionWithAnswersDto[] | null> {
    const quiz = await this.db.quiz.findFirst({ where: { id: quizId }, include: { course: true } });
    if (!quiz) return null;

    const hasAccess = await this.courseShareService.checkAccess(quiz.courseId, userId);
    if (!hasAccess) return null;

    if (questions.length === 0) {
      throw new Error('Provide at least one question.');
    }
    questions.forEach((question, index) => validateQuestion(question, index));

    const maxResult = await this.db.question.aggregate({
      where: { quizId },
      _max: { position: true },
    });
    let nextPosition = (maxResult._max.position ?? -1) + 1;

    return this.db.$transaction(async (tx) => {
      const created: QuestionWithAnswersDto[] = [];
      for (const question of questions) {
        const row = await tx.question.create({
          data: {
            title: question.title.trim(),
            description: question.description?.trim() ?? null,
            type: question.type,
            position: nextPosition++,
            quizId,
            answers: {
              create: question.answers.map((answer, position) => ({
                content: answer.content.trim(),
                isCorrect: answer.isCorrect,
                position,
              })),
            },
          },
          include: { answers: { orderBy: [{ position: 'asc' }] } },
        });
        created.push(row as QuestionWithAnswersDto);
      }
      return created;
    });
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

/**
 * Validates a question for bulk creation, enforcing the answer rules each type
 * needs to be playable. Throws a descriptive error (including the question's
 * 1-based index) on the first violation.
 */
function validateQuestion(question: CreateQuestionWithAnswersRequest, index: number): void {
  const label = `Question ${index + 1}`;
  if (!question.title.trim()) {
    throw new Error(`${label}: title is required.`);
  }
  const correct = question.answers.filter((answer) => answer.isCorrect).length;
  switch (question.type) {
    case 'SINGLE_CHOICE':
      if (question.answers.length < 2) {
        throw new Error(`${label}: SINGLE_CHOICE needs at least 2 answers.`);
      }
      if (correct !== 1) {
        throw new Error(`${label}: SINGLE_CHOICE needs exactly one correct answer.`);
      }
      break;
    case 'MULTIPLE_CHOICE':
      if (question.answers.length < 2) {
        throw new Error(`${label}: MULTIPLE_CHOICE needs at least 2 answers.`);
      }
      if (correct < 1) {
        throw new Error(`${label}: MULTIPLE_CHOICE needs at least one correct answer.`);
      }
      break;
    case 'CARD':
      if (question.answers.length < 1) {
        throw new Error(`${label}: CARD needs at least one answer (the card back).`);
      }
      break;
  }
  if (question.answers.some((answer) => !answer.content.trim())) {
    throw new Error(`${label}: every answer needs content.`);
  }
}
