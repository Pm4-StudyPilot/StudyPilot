import { describe, it, expect, mock } from 'bun:test';
import { TaskService } from '../services/task.service';

const now = new Date('2026-04-15T12:00:00.000Z');

type MockTask = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  position: number;
  completed: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockCourse = { id: string; name: string; ownerId: string };

type MockDb = {
  course: {
    findFirst?: (args: unknown) => Promise<MockCourse | null>;
  };
  task: {
    create?: (args: unknown) => Promise<MockTask>;
    findMany?: (args: unknown) => Promise<MockTask[]>;
    findFirst?: (args: unknown) => Promise<MockTask | null>;
    update?: (args: unknown) => Promise<MockTask>;
    deleteMany?: (args: unknown) => Promise<{ count: number }>;
    aggregate?: (args: unknown) => Promise<{ _max: { position: number | null } }>;
  };
  $transaction?: (fns: unknown[]) => Promise<unknown[]>;
};

function createMockTask(overrides: Partial<MockTask> = {}): MockTask {
  return {
    id: 't1',
    title: 'Write report',
    description: null,
    dueDate: null,
    priority: 'MEDIUM',
    status: 'OPEN',
    position: 0,
    completed: false,
    courseId: 'c1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('TaskService', () => {
  it('should return null when creating a task for a course the user does not own', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: { findFirst },
      task: {},
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.create({ title: 'Test' }, 'c1', 'u2');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'c1', ownerId: 'u2' } });
  });

  it('should create a task with position 0 when course has no tasks yet', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const created = createMockTask();
    const courseFindFirst = mock(async () => course);
    const aggregate = mock(async () => ({ _max: { position: null } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      task: { aggregate, create },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.create({ title: 'Write report' }, 'c1', 'u1');

    expect(result).toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0, courseId: 'c1' }) })
    );
  });

  it('should create a task appended after existing tasks', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const created = createMockTask({ position: 3 });
    const courseFindFirst = mock(async () => course);
    const aggregate = mock(async () => ({ _max: { position: 2 } }));
    const create = mock(async () => created);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      task: { aggregate, create },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    await service.create({ title: 'Write report' }, 'c1', 'u1');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3 }) })
    );
  });

  it('should list tasks ordered by position for an owned course', async () => {
    const tasks = [
      createMockTask({ id: 't1', position: 0 }),
      createMockTask({ id: 't2', position: 1 }),
    ];
    const findMany = mock(async () => tasks);

    const db: MockDb = {
      course: {},
      task: { findMany },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.listByCourse('c1', 'u1');

    expect(result).toEqual(tasks);
    expect(findMany).toHaveBeenCalledWith({
      where: { courseId: 'c1', course: { ownerId: 'u1' } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('should return null when task does not belong to the user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      task: { findFirst },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.findByIdForOwner('t1', 'u2');

    expect(result).toBeNull();
  });

  it('should not update a task that does not belong to the user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      task: { findFirst },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.updateForOwner('t1', 'u2', { title: 'Updated' });

    expect(result).toBeNull();
  });

  it('should update a task owned by the user', async () => {
    const existing = createMockTask();
    const updated = createMockTask({ title: 'Updated title' });
    const findFirst = mock(async () => existing);
    const update = mock(async () => updated);

    const db: MockDb = {
      course: {},
      task: { findFirst, update },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.updateForOwner('t1', 'u1', { title: 'Updated title' });

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { title: 'Updated title' },
    });
  });

  it('should toggle task completion when owned by the user', async () => {
    const existing = createMockTask();
    const completed = createMockTask({ completed: true });
    const findFirst = mock(async () => existing);
    const update = mock(async () => completed);

    const db: MockDb = {
      course: {},
      task: { findFirst, update },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.setCompleted('t1', 'u1', true);

    expect(result).toEqual(completed);
    expect(update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { completed: true },
    });
  });

  it('should return null when setting completion on a task not owned by user', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: {},
      task: { findFirst },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.setCompleted('t1', 'u2', true);

    expect(result).toBeNull();
  });

  it('should return true when deleting an owned task', async () => {
    const deleteMany = mock(async () => ({ count: 1 }));

    const db: MockDb = {
      course: {},
      task: { deleteMany },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.deleteForOwner('t1', 'u1');

    expect(result).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 't1', course: { ownerId: 'u1' } },
    });
  });

  it('should return false when deleting a task that does not belong to the user', async () => {
    const deleteMany = mock(async () => ({ count: 0 }));

    const db: MockDb = {
      course: {},
      task: { deleteMany },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.deleteForOwner('t1', 'u2');

    expect(result).toBe(false);
  });

  it('should return false when reordering tasks for a course the user does not own', async () => {
    const findFirst = mock(async () => null);

    const db: MockDb = {
      course: { findFirst },
      task: {},
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.reorderTasks('c1', 'u2', ['t1', 't2']);

    expect(result).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'c1', ownerId: 'u2' } });
  });

  it('should return false when provided task ids do not match the course tasks', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const courseFindFirst = mock(async () => course);
    const findMany = mock(async () => [createMockTask({ id: 't1' }), createMockTask({ id: 't2' })]);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      task: { findMany },
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.reorderTasks('c1', 'u1', ['t1', 't3']);

    expect(result).toBe(false);
  });

  it('should update positions atomically when reordering owned tasks', async () => {
    const course: MockCourse = { id: 'c1', name: 'Biology', ownerId: 'u1' };
    const courseFindFirst = mock(async () => course);
    const findMany = mock(async () => [createMockTask({ id: 't1' }), createMockTask({ id: 't2' })]);
    const update = mock(async (args: unknown) => args as MockTask);
    const $transaction = mock(async () => []);

    const db: MockDb = {
      course: { findFirst: courseFindFirst },
      task: { findMany, update },
      $transaction,
    };

    const service = new TaskService(db as unknown as ConstructorParameters<typeof TaskService>[0]);
    const result = await service.reorderTasks('c1', 'u1', ['t2', 't1']);

    expect(result).toBe(true);
    expect($transaction).toHaveBeenCalledTimes(1);
  });
});
