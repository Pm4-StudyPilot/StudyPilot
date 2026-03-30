import { describe, it, expect, mock } from 'bun:test';
import { CourseService } from '../services/course.service';

const now = new Date('2026-03-26T12:00:00.000Z');

type MockCourse = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockCourseDb = {
  course: {
    create?: (args: { data: { name: string; ownerId: string } }) => Promise<MockCourse>;
    findMany?: (args: {
      where: { ownerId: string };
      orderBy: { createdAt: 'desc' };
    }) => Promise<MockCourse[]>;
    findFirst?: (args: { where: { id: string; ownerId: string } }) => Promise<MockCourse | null>;
    update?: (args: { where: { id: string }; data: { name: string } }) => Promise<MockCourse>;
    deleteMany?: (args: { where: { id: string; ownerId: string } }) => Promise<{ count: number }>;
  };
};

function createMockCourse(id: string, name: string, ownerId: string): MockCourse {
  return {
    id,
    name,
    ownerId,
    createdAt: now,
    updatedAt: now,
  };
}

describe('CourseService', () => {
  it('should create a course with name and ownerId', async () => {
    const created = createMockCourse('c1', 'Biology 101', 'u1');
    const create = mock(async () => created);

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
        ownerId: 'u1',
      },
    });
  });

  it('should list courses by owner in descending create date order', async () => {
    const courses = [createMockCourse('c2', 'Math', 'u1'), createMockCourse('c1', 'Biology', 'u1')];
    const findMany = mock(async () => courses);

    const db: MockCourseDb = {
      course: {
        findMany,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.listByOwner('u1');

    expect(result).toEqual(courses);
    expect(findMany).toHaveBeenCalledWith({
      where: { ownerId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return course only when it belongs to owner', async () => {
    const course = createMockCourse('c1', 'Biology', 'u1');
    const findFirst = mock(async () => course);

    const db: MockCourseDb = {
      course: {
        findFirst,
      },
    };

    const service = new CourseService(
      db as unknown as ConstructorParameters<typeof CourseService>[0]
    );
    const result = await service.findByIdForOwner('c1', 'u1');

    expect(result).toEqual(course);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'c1',
        ownerId: 'u1',
      },
    });
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
    const existing = createMockCourse('c1', 'Biology', 'u1');
    const updated = createMockCourse('c1', 'Biology 102', 'u1');
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

    expect(result).toEqual(updated);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Biology 102' },
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
