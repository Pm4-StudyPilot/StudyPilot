import { describe, it, expect, mock } from 'bun:test';
import { AnswerService } from '../services/answer.service';

const now = new Date('2026-04-15T12:00:00.000Z');

type MockAnswer = {
  id: string;
  content: string;
  isCorrect: boolean;
  position: number;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockCourse = { id: string; name: string; ownerId: string };
type MockQuestion = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  type: 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'CARD';
  quizId: string;
};
type MockQuiz = {
  id: string;
  title: string;
  description: string | null;
  isOrderRandom: boolean;
  courseId: string;
};

type MockDb = {
  question: {
    findFirst?: (args: unknown) => Promise<MockQuestion | null>;
  };
  quiz: {
    findFirst?: (args: unknown) => Promise<MockQuiz | null>;
  };
  course: {
    findFirst?: (args: unknown) => Promise<MockCourse | null>;
  };
  answer: {
    create?: (args: unknown) => Promise<MockAnswer>;
    findMany?: (args: unknown) => Promise<MockAnswer[]>;
    findFirst?: (args: unknown) => Promise<MockAnswer | null>;
    update?: (args: unknown) => Promise<MockAnswer>;
    deleteMany?: (args: unknown) => Promise<{ count: number }>;
    aggregate?: (args: unknown) => Promise<{ _max: { position: number | null } }>;
  };
  $transaction?: (fns: unknown[]) => Promise<unknown[]>;
};

function createMockAnswer(overrides: Partial<MockAnswer> = {}): MockAnswer {
  return {
    id: 'a1',
    content: 'The answer is 42',
    isCorrect: true,
    position: 0,
    courseId: 'c1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AnswerService', () => {
  it('should return null when creating an answer for a question the user does not own', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: { findFirst },
      quiz: { findFirst },
      question: { findFirst },
      answer: {},
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.create({ content: 'Test', isCorrect: false }, 'q1', 'u2');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'q1', quiz: { course: { ownerId: 'u2' } } },
    });
  });

  it('should create a question with position 0 when question has no answers yet', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Quiz 1',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
    };
    const question: MockQuestion = {
      id: 'q1',
      title: 'What is 2 + 2?',
      description: null,
      position: 0,
      type: 'MULTIPLE_CHOICE',
      quizId: 'qz1',
    };
    const created = createMockAnswer();
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const questionFindFirst = mock(async () => question);
    const aggregate = mock(async () => ({ _max: { position: null } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findFirst: questionFindFirst },
      answer: { aggregate, create },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.create({ content: 'Test', isCorrect: false }, 'q1', 'u1');

    expect(result).toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0, questionId: 'q1' }) })
    );
  });

  it('should create an answer with the specified content and correctness', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Quiz 1',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
    };
    const question: MockQuestion = {
      id: 'q1',
      title: 'What is 2 + 2?',
      description: null,
      position: 0,
      type: 'MULTIPLE_CHOICE',
      quizId: 'qz1',
    };
    const created = createMockAnswer();

    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const questionFindFirst = mock(async () => question);
    const aggregate = mock(async () => ({ _max: { position: null } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findFirst: questionFindFirst },
      answer: { aggregate, create },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.create({ content: 'Test', isCorrect: false }, 'q1', 'u1');

    expect(result).toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          position: 0,
          content: 'Test',
          isCorrect: false,
          questionId: 'q1',
        }),
      })
    );
  });

  it('should create an answer appended after existing answers', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qz1',
      title: 'Quiz 1',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
    };
    const question: MockQuestion = {
      id: 'q1',
      title: 'What is 2 + 2?',
      description: null,
      position: 0,
      type: 'MULTIPLE_CHOICE',
      quizId: 'qz1',
    };
    const created = createMockAnswer({ position: 3 });
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const questionFindFirst = mock(async () => question);
    const aggregate = mock(async () => ({ _max: { position: 2 } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findFirst: questionFindFirst },
      answer: { aggregate, create },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    await service.create({ content: 'Test', isCorrect: false }, 'q1', 'u1');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3 }) })
    );
  });

  it('should list answers ordered by position for an owned quiz', async () => {
    const answers = [
      createMockAnswer({ id: 'a1', position: 0 }),
      createMockAnswer({ id: 'a2', position: 1 }),
    ];
    const findMany = mock(async () => answers);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: {},
      answer: { findMany },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.listByQuestion('q1', 'u1');

    expect(result).toEqual(answers);
    expect(findMany).toHaveBeenCalledWith({
      where: { questionId: 'q1', question: { quiz: { course: { ownerId: 'u1' } } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('should return null when question does not belong to the user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: {},
      answer: { findFirst },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.findByIdForOwner('a1', 'u2');

    expect(result).toBeNull();
  });

  it('should not update an answer that does not belong to the user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: {},
      answer: { findFirst },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.updateForOwner('a1', 'u2', { content: 'Updated' });

    expect(result).toBeNull();
  });

  it('should update an answer owned by the user', async () => {
    const existing = createMockAnswer();
    const updated = createMockAnswer({ content: 'Updated content' });
    const findFirst = mock(async () => existing);
    const update = mock(async () => updated);

    const db: MockDb = {
      course: {},
      quiz: {},
      question: {},
      answer: { findFirst, update },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.updateForOwner('a1', 'u1', { content: 'Updated content' });

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { content: 'Updated content' },
    });
  });

  it('should return true when deleting an owned question', async () => {
    const deleteMany = mock(async () => ({ count: 1 }));

    const db: MockDb = {
      course: {},
      quiz: {},
      question: {},
      answer: { deleteMany },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.deleteForOwner('a1', 'u1');

    expect(result).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'a1', question: { quiz: { course: { ownerId: 'u1' } } } },
    });
  });

  it('should return false when deleting an answer that does not belong to the user', async () => {
    const deleteMany = mock(async () => ({ count: 0 }));

    const db: MockDb = {
      course: {},
      quiz: {},
      question: {},
      answer: { deleteMany },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.deleteForOwner('a1', 'u2');

    expect(result).toBe(false);
  });

  it('should return false when reordering questions for a course the user does not own', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: { findFirst },
      quiz: { findFirst },
      question: { findFirst },
      answer: {},
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.reorderAnswers('q1', 'u2', ['a1', 'a2']);

    expect(result).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'q1', quiz: { course: { ownerId: 'u2' } } },
    });
  });

  it('should return false when provided question ids do not match the course questions', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'qy1',
      title: 'Biology Quiz',
      courseId: 'c1',
      description: null,
      isOrderRandom: false,
    };
    const question: MockQuestion = {
      id: 'q1',
      title: 'What is 2 + 2?',
      description: null,
      position: 0,
      type: 'MULTIPLE_CHOICE',
      quizId: 'q1',
    };
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const questionFindFirst = mock(async () => question);
    const findMany = mock(async () => [
      createMockAnswer({ id: 'a1' }),
      createMockAnswer({ id: 'a2' }),
    ]);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findFirst: questionFindFirst },
      answer: { findMany },
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.reorderAnswers('q1', 'u1', ['a1', 'a3']);

    expect(result).toBe(false);
  });

  it('should update positions atomically when reordering owned questions', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const quiz: MockQuiz = {
      id: 'q1',
      title: 'Biology Quiz',
      courseId: 'c1',
      description: null,
      isOrderRandom: false,
    };
    const question: MockQuestion = {
      id: 'q1',
      title: 'What is 2 + 2?',
      description: null,
      position: 0,
      type: 'MULTIPLE_CHOICE',
      quizId: 'q1',
    };
    const courseFindFirst = mock(async () => course);
    const quizFindFirst = mock(async () => quiz);
    const questionFindFirst = mock(async () => question);
    const findMany = mock(async () => [
      createMockAnswer({ id: 'a1' }),
      createMockAnswer({ id: 'a2' }),
    ]);
    const update = mock(async (args: unknown) => args as MockAnswer);
    const $transaction = mock(async () => []);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      quiz: { findFirst: quizFindFirst },
      question: { findFirst: questionFindFirst },
      answer: { findMany, update },
      $transaction,
    };

    const service = new AnswerService(
      db as unknown as ConstructorParameters<typeof AnswerService>[0]
    );
    const result = await service.reorderAnswers('c1', 'u1', ['a2', 'a1']);

    expect(result).toBe(true);
    expect($transaction).toHaveBeenCalledTimes(1);
  });
});
