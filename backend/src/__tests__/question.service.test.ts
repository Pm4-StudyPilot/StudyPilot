import { describe, it, expect, mock } from 'bun:test';
import { QuestionService } from '../services/question.service';

const now = new Date('2026-04-15T12:00:00.000Z');

type MockQuestion = {
  id: string;
  title: string;
  description: string;
  position: number;
  type: 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'CARD';
  quizId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockCourse = { id: string; name: string; ownerId: string };
type MockQuiz = {
  id: string;
  title: string;
  description: string | null;
  isOrderRandom: boolean;
  courseId: string;
};

type MockDb = {
  quiz: {
    findFirst?: (args: unknown) => Promise<MockQuiz | null>;
  };
  course: {
    findFirst?: (args: unknown) => Promise<MockCourse | null>;
  };
  question: {
    create?: (args: unknown) => Promise<MockQuestion>;
    findMany?: (args: unknown) => Promise<MockQuestion[]>;
    findFirst?: (args: unknown) => Promise<MockQuestion | null>;
    update?: (args: unknown) => Promise<MockQuestion>;
    deleteMany?: (args: unknown) => Promise<{ count: number }>;
    aggregate?: (args: unknown) => Promise<{ _max: { position: number | null } }>;
  };
  $transaction?: (fns: unknown[]) => Promise<unknown[]>;
};

function createMockQuestion(overrides: Partial<MockQuestion> = {}): MockQuestion {
  return {
    id: 'q1',
    title: 'What is the capital of France?',
    description: '',
    type: 'MULTIPLE_CHOICE',
    position: 0,
    quizId: 'qz1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('QuestionService', () => {
  it('should return null when creating a question for a quiz the user does not own', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: { findFirst },
      quiz: { findFirst },
      question: {},
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.create({ title: 'Test', type: 'MULTIPLE_CHOICE' }, 'qz1', 'u2');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'qz1', course: { ownerId: 'u2' } } });
  });

  it('should create a question with position 0 when quiz has no questions yet', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Quiz 1',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
    };
    const created = createMockQuestion();
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const aggregate = mock(async () => ({ _max: { position: null } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { aggregate, create },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.create(
      { title: 'Write report', type: 'MULTIPLE_CHOICE' },
      'qz1',
      'u1'
    );

    expect(result).toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0, quizId: 'qz1' }) })
    );
  });

  it('should create a question appended after existing questions', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Quiz 1',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
    };
    const created = createMockQuestion({ position: 3 });
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const aggregate = mock(async () => ({ _max: { position: 2 } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { aggregate, create },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    await service.create({ title: 'Write report', type: 'MULTIPLE_CHOICE' }, 'qz1', 'u1');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3 }) })
    );
  });

  it('should list questions ordered by position for an owned quiz', async () => {
    const questions = [
      createMockQuestion({ id: 't1', position: 0 }),
      createMockQuestion({ id: 't2', position: 1 }),
    ];
    const findMany = mock(async () => questions);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: { findMany },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.listByQuiz('qz1', 'u1');

    expect(result).toEqual(questions);
    expect(findMany).toHaveBeenCalledWith({
      where: { quizId: 'qz1', quiz: { course: { ownerId: 'u1' } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('should return null when question does not belong to the user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: { findFirst },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.findByIdForOwner('q1', 'u2');

    expect(result).toBeNull();
  });

  it('should not update a question that does not belong to the user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: { findFirst },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.updateForOwner('q1', 'u2', { title: 'Updated' });

    expect(result).toBeNull();
  });

  it('should update a question owned by the user', async () => {
    const existing = createMockQuestion();
    const updated = createMockQuestion({ title: 'Updated title' });
    const findFirst = mock(async () => existing);
    const update = mock(async () => updated);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: { findFirst, update },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.updateForOwner('q1', 'u1', { title: 'Updated title' });

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: { title: 'Updated title' },
    });
  });

  it('should return true when deleting an owned question', async () => {
    const deleteMany = mock(async () => ({ count: 1 }));

    const db: MockDb = {
      course: {},
      quiz: {},
      question: { deleteMany },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.deleteForOwner('q1', 'u1');

    expect(result).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'q1', quiz: { course: { ownerId: 'u1' } } },
    });
  });

  it('should return false when deleting a question that does not belong to the user', async () => {
    const deleteMany = mock(async () => ({ count: 0 }));

    const db: MockDb = {
      course: {},
      quiz: {},
      question: { deleteMany },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.deleteForOwner('q1', 'u2');

    expect(result).toBe(false);
  });

  it('should return false when reordering questions for a course the user does not own', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: { findFirst },
      quiz: { findFirst },
      question: {},
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.reorderQuestions('qz1', 'u2', ['q1', 'q2']);

    expect(result).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'qz1', course: { ownerId: 'u2' } } });
  });

  it('should return false when provided question ids do not match the course questions', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Biology Quiz',
      courseId: 'c1',
      description: null,
      isOrderRandom: false,
    };
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const findMany = mock(async () => [
      createMockQuestion({ id: 'q1' }),
      createMockQuestion({ id: 'q2' }),
    ]);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findMany },
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.reorderQuestions('qz1', 'u1', ['q1', 'q3']);

    expect(result).toBe(false);
  });

  it('should update positions atomically when reordering owned questions', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Biology Quiz',
      courseId: 'c1',
      description: null,
      isOrderRandom: false,
    };
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const findMany = mock(async () => [
      createMockQuestion({ id: 'q1' }),
      createMockQuestion({ id: 'q2' }),
    ]);
    const update = mock(async (args: unknown) => args as MockQuestion);
    const $transaction = mock(async () => []);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findMany, update },
      $transaction,
    };

    const service = new QuestionService(
      db as unknown as ConstructorParameters<typeof QuestionService>[0]
    );
    const result = await service.reorderQuestions('qz1', 'u1', ['q2', 'q1']);

    expect(result).toBe(true);
    expect($transaction).toHaveBeenCalledTimes(1);
  });
});
