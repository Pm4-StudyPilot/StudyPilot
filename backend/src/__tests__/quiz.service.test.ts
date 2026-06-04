import { describe, it, expect, mock } from 'bun:test';
import { QuizService } from '../services/quiz.service';
import { CourseShareService } from '../services/course-share.service';

const now = new Date('2026-04-15T12:00:00.000Z');

type MockQuiz = {
  id: string;
  title: string;
  description: string | null;
  isOrderRandom: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockCourse = { id: string; name: string; ownerId: string };

type MockDb = {
  course: {
    findFirst?: (args: unknown) => Promise<MockCourse | null>;
  };
  quiz: {
    create?: (args: unknown) => Promise<MockQuiz>;
    findMany?: (args: unknown) => Promise<MockQuiz[]>;
    findFirst?: (args: unknown) => Promise<MockQuiz | null>;
    update?: (args: unknown) => Promise<MockQuiz>;
    deleteMany?: (args: unknown) => Promise<{ count: number }>;
    aggregate?: (args: unknown) => Promise<{ _max: { position: number | null } }>;
  };
  $transaction?: (fns: unknown[]) => Promise<unknown[]>;
};

function createMockQuiz(overrides: Partial<MockQuiz> = {}): MockQuiz {
  return {
    id: 'q1',
    title: 'Write report',
    description: null,
    isOrderRandom: false,
    courseId: 'c1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('QuizService', () => {
  it('should return null when creating a quiz for a course the user does not own', async () => {
    const db: MockDb = {
      course: {},
      quiz: {},
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => false),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.create({ title: 'Test' }, 'c1', 'u2');

    expect(result).toBeNull();
    expect(mockCourseShareService.checkAccess).toHaveBeenCalledWith('c1', 'u2');
  });

  it('should return null when a quiz does not belong to the user', async () => {
    const quiz = createMockQuiz();
    const findFirst = mock(async () => ({
      ...quiz,
      course: { id: 'c1', name: 'Biology', ownerId: 'u1' },
    }));

    const db: MockDb = {
      course: {},
      quiz: { findFirst },
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => false),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.findByIdForOwner('q1', 'u2');

    expect(result).toBeNull();
    expect(mockCourseShareService.checkAccess).toHaveBeenCalledWith('c1', 'u2');
  });

  it('should not update a quiz that does not belong to the user', async () => {
    const quiz = createMockQuiz();
    const findFirst = mock(async () => ({
      ...quiz,
      course: { id: 'c1', name: 'Biology', ownerId: 'u1' },
    }));

    const db: MockDb = {
      course: {},
      quiz: { findFirst },
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => false),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.updateForOwner('q1', 'u2', { title: 'Updated' });

    expect(result).toBeNull();
    expect(mockCourseShareService.checkAccess).toHaveBeenCalledWith('c1', 'u2');
  });

  it('should update a quiz owned by the user', async () => {
    const existing = createMockQuiz();
    const updated = createMockQuiz({ title: 'Updated title' });
    const findFirst = mock(async () => ({
      ...existing,
      course: { id: 'c1', name: 'Biology', ownerId: 'u1' },
    }));
    const update = mock(async () => updated);

    const db: MockDb = {
      course: {},
      quiz: { findFirst, update },
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => true),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.updateForOwner('q1', 'u1', { title: 'Updated title' });

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: { title: 'Updated title' },
    });
  });

  it('should list quizzes for an owned course', async () => {
    const quizzes = [createMockQuiz({ id: 'q1' }), createMockQuiz({ id: 'q2' })];
    const findMany = mock(async () => quizzes);

    const db: MockDb = {
      course: {},
      quiz: { findMany },
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => true),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.listByCourse('c1', 'u1');

    expect(result.sort()).toEqual(quizzes.sort());
    expect(mockCourseShareService.checkAccess).toHaveBeenCalledWith('c1', 'u1');
    expect(findMany).toHaveBeenCalledWith({
      where: { courseId: 'c1' },
      orderBy: [{ createdAt: 'asc' }],
    });
  });

  it('should return true when deleting an owned quiz', async () => {
    const quiz = createMockQuiz();
    const findFirst = mock(async () => ({
      ...quiz,
      course: { id: 'c1', name: 'Biology', ownerId: 'u1' },
    }));
    const deleteMany = mock(async () => ({ count: 1 }));

    const db: MockDb = {
      course: {},
      quiz: { findFirst, deleteMany },
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => true),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.deleteForOwner('q1', 'u1');

    expect(result).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'q1' },
    });
  });

  it('should return false when deleting a quiz that does not belong to the user', async () => {
    const quiz = createMockQuiz();
    const findFirst = mock(async () => ({
      ...quiz,
      course: { id: 'c1', name: 'Biology', ownerId: 'u1' },
    }));

    const db: MockDb = {
      course: {},
      quiz: { findFirst },
    };

    const mockCourseShareService = {
      checkAccess: mock(async () => false),
    };

    const service = new QuizService(
      db as unknown as ConstructorParameters<typeof QuizService>[0],
      mockCourseShareService as unknown as CourseShareService
    );
    const result = await service.deleteForOwner('q1', 'u2');

    expect(result).toBe(false);
    expect(mockCourseShareService.checkAccess).toHaveBeenCalledWith('c1', 'u2');
  });
});
