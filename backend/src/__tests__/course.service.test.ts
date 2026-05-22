import { describe, it, expect, mock } from 'bun:test';
import { CourseService } from '../services/course.service';

const now = new Date('2026-03-26T12:00:00.000Z');

type MockCourse = {
  id: string;
  name: string;
  color: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  taskProgress: {
    totalTasks: number;
    openTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    completionPercentage: number;
  };
};

type MockTask = {
  status: string;
};

type MockCourseDb = {
  course: {
    create?: (args: {
      data: { name: string; color: string; ownerId: string };
      select: unknown;
    }) => Promise<MockCourse & { tasks: MockTask[] }>;
    findMany?: (args: {
      where: { ownerId?: string; courseShares?: unknown };
      orderBy: { createdAt: 'desc' };
      select: unknown;
    }) => Promise<(MockCourse & { tasks: MockTask[] })[]>;
    findFirst?: (args: {
      where: { id: string; ownerId?: string };
      select: unknown;
    }) => Promise<(MockCourse & { tasks: MockTask[] }) | null>;
    findUnique?: (args: {
      where: { id: string };
      select: unknown;
    }) => Promise<({ ownerId: string } | (MockCourse & { tasks: MockTask[] })) | null>;
    update?: (args: {
      where: { id: string };
      data: { name: string; color?: string };
      select: unknown;
    }) => Promise<MockCourse & { tasks: MockTask[] }>;
    deleteMany?: (args: { where: { id: string; ownerId?: string } }) => Promise<{ count: number }>;
  };
  courseShare?: {
    findFirst?: (args: {
      where: { courseId: string; sharedWithUserId: string };
    }) => Promise<{ id: string } | null>;
  };
};

function createMockCourse(
  id: string,
  name: string,
  ownerId: string,
  color: string | null = '#6C63FF'
): MockCourse {
  return {
    id,
    name,
    color,
    ownerId,
    createdAt: now,
    updatedAt: now,
    taskProgress: {
      totalTasks: 0,
      openTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      completionPercentage: 0,
    },
  };
}

function createExpectedCourse(
  id: string,
  name: string,
  ownerId: string,
  color = '#6C63FF'
): Omit<MockCourse, 'color'> & { color: string } {
  return {
    ...createMockCourse(id, name, ownerId, color),
    color,
  };
}

describe('CourseService', () => {
  it('should create a course with name and ownerId', async () => {
    const created = createExpectedCourse('c1', 'Biology 101', 'u1');
    const create = mock(async () => ({ ...created, tasks: [] }));

    const db: MockCourseDb = {
      course: {
        create,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.create('Biology 101', 'u1');

    expect(result).toEqual(created);
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Biology 101',
        color: expect.any(String),
        ownerId: 'u1',
      },
      select: expect.any(Object),
    });
  });

  it('should list courses by owner in descending create date order', async () => {
    const courses = [
      { ...createMockCourse('c2', 'Math', 'u1'), tasks: [{ status: 'DONE' }, { status: 'OPEN' }] },
      { ...createMockCourse('c1', 'Biology', 'u1'), tasks: [] },
    ];

    const findMany = mock(async (args) => {
      // First call: owned courses, Second call: shared courses (return empty)
      if ('ownerId' in (args?.where || {})) {
        return courses;
      }
      return [];
    });

    const db: MockCourseDb = {
      course: {
        findMany,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.listByOwner('u1');

    expect(result).toEqual([
      {
        ...createExpectedCourse('c2', 'Math', 'u1'),
        taskProgress: {
          totalTasks: 2,
          openTasks: 1,
          inProgressTasks: 0,
          completedTasks: 1,
          completionPercentage: 50,
        },
      },
      createExpectedCourse('c1', 'Biology', 'u1'),
    ]);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('should include shared courses when listing accessible courses', async () => {
    const ownedCourse = { ...createMockCourse('c1', 'Biology', 'u1'), tasks: [] };
    const sharedCourse = { ...createMockCourse('c2', 'Physics', 'u2', '#4DA3FF'), tasks: [] };

    const findMany = mock(async (args) => {
      if ('ownerId' in (args?.where || {})) {
        return [ownedCourse];
      }

      return [sharedCourse];
    });

    const db: MockCourseDb = {
      course: {
        findMany,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.listByUser('u1');

    expect(result).toEqual([
      createExpectedCourse('c1', 'Biology', 'u1'),
      createExpectedCourse('c2', 'Physics', 'u2', '#4DA3FF'),
    ]);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('should return course only when it belongs to owner', async () => {
    const course = { ...createMockCourse('c1', 'Biology', 'u1'), tasks: [{ status: 'DONE' }] };

    let callCount = 0;
    const findUnique = mock(async (_args) => {
      callCount++;
      // First call: hasAccess check (select only ownerId)
      // Second call: full course with tasks (select COURSE_OVERVIEW_SELECT)
      if (callCount === 1) {
        return { ownerId: 'u1' };
      }
      return course;
    });

    const db: MockCourseDb = {
      course: {
        findUnique,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.findByIdForOwner('c1', 'u1');

    expect(result).toEqual({
      ...createExpectedCourse('c1', 'Biology', 'u1'),
      taskProgress: {
        totalTasks: 1,
        openTasks: 0,
        inProgressTasks: 0,
        completedTasks: 1,
        completionPercentage: 100,
      },
    });
  });

  it('should return shared courses when a share exists', async () => {
    const course = { ...createMockCourse('c1', 'Biology', 'u1'), tasks: [{ status: 'DONE' }] };

    let callCount = 0;
    const findUnique = mock(async () => {
      callCount++;
      if (callCount === 1) {
        return { ownerId: 'u1' };
      }
      return course;
    });
    const findFirst = mock(async () => ({ id: 'share-1' }));

    const db: MockCourseDb = {
      course: {
        findUnique,
      },
      courseShare: {
        findFirst,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.findByIdForUser('c1', 'u2');

    expect(result).toEqual({
      ...createExpectedCourse('c1', 'Biology', 'u1'),
      taskProgress: {
        totalTasks: 1,
        openTasks: 0,
        inProgressTasks: 0,
        completedTasks: 1,
        completionPercentage: 100,
      },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { courseId: 'c1', sharedWithUserId: 'u2' },
    });
  });

  it('should resolve a fallback color when a stored course has no color', async () => {
    const course = { ...createMockCourse('c1', 'Biology', 'u1', null), tasks: [] };

    let callCount = 0;
    const findUnique = mock(async () => {
      callCount++;
      if (callCount === 1) {
        return { ownerId: 'u1' };
      }
      return course;
    });

    const db: MockCourseDb = {
      course: {
        findUnique,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.findByIdForOwner('c1', 'u1');

    expect(result?.color).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('should not update a course that is not owned by user', async () => {
    const findFirst = mock(async () => null);

    const db: MockCourseDb = {
      course: {
        findFirst,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.updateForOwner('c1', 'u2', 'Biology 102');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'c1',
        ownerId: 'u2',
      },
    });
  });

  it('should update a course when it is owned by user', async () => {
    const existing = { ...createMockCourse('c1', 'Biology', 'u1'), tasks: [{ status: 'OPEN' }] };
    const updatedCourse = createExpectedCourse('c1', 'Biology 102', 'u1');
    const updated = { ...updatedCourse, tasks: [{ status: 'OPEN' }] };
    const findFirst = mock(async () => existing);
    const update = mock(async () => updated);

    const db: MockCourseDb = {
      course: {
        findFirst,
        update,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.updateForOwner('c1', 'u1', 'Biology 102');

    expect(result).toEqual({
      ...updatedCourse,
      taskProgress: {
        totalTasks: 1,
        openTasks: 1,
        inProgressTasks: 0,
        completedTasks: 0,
        completionPercentage: 0,
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Biology 102' },
      select: expect.any(Object),
    });
  });

  it('should update a course color when provided', async () => {
    const existing = { ...createMockCourse('c1', 'Biology', 'u1'), tasks: [] };
    const updatedCourse = createExpectedCourse('c1', 'Biology 102', 'u1', '#4DA3FF');
    const updated = { ...updatedCourse, tasks: [] };
    const findFirst = mock(async () => existing);
    const update = mock(async () => updated);

    const db: MockCourseDb = {
      course: {
        findFirst,
        update,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.updateForOwner('c1', 'u1', 'Biology 102', '#4DA3FF');

    expect(result).toEqual(updatedCourse);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Biology 102', color: '#4DA3FF' },
      select: expect.any(Object),
    });
  });

  it('should return true when delete removes an owned course', async () => {
    const deleteMany = mock(async () => ({ count: 1 }));

    const db: MockCourseDb = {
      course: {
        deleteMany,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.deleteForOwner('c1', 'u1');

    expect(result).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'c1',
        ownerId: 'u1',
      },
    });
  });

  it('should return false when delete removes nothing', async () => {
    const deleteMany = mock(async () => ({ count: 0 }));

    const db: MockCourseDb = {
      course: {
        deleteMany,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.deleteForOwner('c1', 'u1');

    expect(result).toBe(false);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'c1',
        ownerId: 'u1',
      },
    });
  });
});
