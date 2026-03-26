import { describe, it, expect, mock } from "bun:test";
import { CourseService } from "../services/course.service";

const now = new Date("2026-03-26T12:00:00.000Z");

function createMockCourse(id: string, name: string, ownerId: string) {
  return {
    id,
    name,
    ownerId,
    createdAt: now,
    updatedAt: now,
  };
}

describe("CourseService", () => {
  it("should create a course with name and ownerId", async () => {
    const created = createMockCourse("c1", "Biology 101", "u1");

    const db = {
      course: {
        create: mock(async () => created),
        findMany: mock(async () => []),
        findFirst: mock(async () => null),
        update: mock(async () => created),
        deleteMany: mock(async () => ({ count: 0 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.create("Biology 101", "u1");

    expect(result).toEqual(created);
    expect(db.course.create).toHaveBeenCalledWith({
      data: {
        name: "Biology 101",
        ownerId: "u1",
      },
    });
  });

  it("should list courses by owner in descending create date order", async () => {
    const courses = [
      createMockCourse("c2", "Math", "u1"),
      createMockCourse("c1", "Biology", "u1"),
    ];

    const db = {
      course: {
        create: mock(async () => courses[0]),
        findMany: mock(async () => courses),
        findFirst: mock(async () => null),
        update: mock(async () => courses[0]),
        deleteMany: mock(async () => ({ count: 0 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.listByOwner("u1");

    expect(result).toEqual(courses);
    expect(db.course.findMany).toHaveBeenCalledWith({
      where: { ownerId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return course only when it belongs to owner", async () => {
    const course = createMockCourse("c1", "Biology", "u1");

    const db = {
      course: {
        create: mock(async () => course),
        findMany: mock(async () => []),
        findFirst: mock(async () => course),
        update: mock(async () => course),
        deleteMany: mock(async () => ({ count: 0 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.findByIdForOwner("c1", "u1");

    expect(result).toEqual(course);
    expect(db.course.findFirst).toHaveBeenCalledWith({
      where: {
        id: "c1",
        ownerId: "u1",
      },
    });
  });

  it("should not update a course that is not owned by user", async () => {
    const db = {
      course: {
        create: mock(async () => createMockCourse("c1", "Biology", "u1")),
        findMany: mock(async () => []),
        findFirst: mock(async () => null),
        update: mock(async () => createMockCourse("c1", "Biology 102", "u1")),
        deleteMany: mock(async () => ({ count: 0 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.updateForOwner("c1", "u2", "Biology 102");

    expect(result).toBeNull();
    expect(db.course.findFirst).toHaveBeenCalledWith({
      where: {
        id: "c1",
        ownerId: "u2",
      },
    });
    expect(db.course.update).not.toHaveBeenCalled();
  });

  it("should update a course when it is owned by user", async () => {
    const existing = createMockCourse("c1", "Biology", "u1");
    const updated = createMockCourse("c1", "Biology 102", "u1");

    const db = {
      course: {
        create: mock(async () => existing),
        findMany: mock(async () => []),
        findFirst: mock(async () => existing),
        update: mock(async () => updated),
        deleteMany: mock(async () => ({ count: 0 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.updateForOwner("c1", "u1", "Biology 102");

    expect(result).toEqual(updated);
    expect(db.course.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { name: "Biology 102" },
    });
  });

  it("should return true when delete removes an owned course", async () => {
    const db = {
      course: {
        create: mock(async () => createMockCourse("c1", "Biology", "u1")),
        findMany: mock(async () => []),
        findFirst: mock(async () => null),
        update: mock(async () => createMockCourse("c1", "Biology 102", "u1")),
        deleteMany: mock(async () => ({ count: 1 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.deleteForOwner("c1", "u1");

    expect(result).toBe(true);
    expect(db.course.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "c1",
        ownerId: "u1",
      },
    });
  });

  it("should return false when delete removes nothing", async () => {
    const db = {
      course: {
        create: mock(async () => createMockCourse("c1", "Biology", "u1")),
        findMany: mock(async () => []),
        findFirst: mock(async () => null),
        update: mock(async () => createMockCourse("c1", "Biology 102", "u1")),
        deleteMany: mock(async () => ({ count: 0 })),
      },
    };

    const service = new CourseService(db as any);
    const result = await service.deleteForOwner("c1", "u1");

    expect(result).toBe(false);
  });
});
