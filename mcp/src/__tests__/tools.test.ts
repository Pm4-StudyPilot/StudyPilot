import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// --- Mock the backend services barrel so no real DB/Prisma is loaded. ---
const courseList = mock(async () => []);
const courseFind = mock(async () => ({ id: 'c1', name: 'Biology' }));
const courseCreate = mock(async () => ({ id: 'c1', name: 'Biology' }));
const courseUpdate = mock(async () => ({ id: 'c1', name: 'Bio 2' }));
const courseDelete = mock(async () => true);
const courseShare = mock(async () => ({
  id: 's1',
  courseId: 'c1',
  sharedWithUserId: 'u2',
  sharedByUserId: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}));
const courseUnshare = mock(async () => true);
const courseSharedUsers = mock(async () => [
  {
    id: 'u2',
    username: 'shared',
    email: 'shared@example.com',
    sharedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
]);
const courseSharedCourses = mock(async () => [
  {
    id: 'c2',
    name: 'Physics',
    ownerId: 'u2',
    ownerUsername: 'owner',
    sharedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
]);

const taskDelete = mock(async () => true);

const quizCreate = mock(async () => ({ id: 'q1', title: 'Midterm' }));
const quizUpdate = mock(async () => ({ id: 'q1', title: 'Midterm 2' }));
const quizDelete = mock(async () => true);
const documentList = mock(async () => []);
const documentRead = mock(async () => ({
  courseId: 'c1',
  documents: [],
  chunks: [],
  skipped: [],
  errors: [],
  warnings: [],
  totalDocuments: 0,
  returnedCharacters: 0,
  maxCharacters: 25000,
  truncated: false,
}));

class CourseService {
  listByUser = courseList;
  findByIdForUser = courseFind;
  create = courseCreate;
  updateForOwner = courseUpdate;
  deleteForOwner = courseDelete;
}
class ShareError extends Error {
  public type: 'CourseNotFound' | 'UserNotFound' | 'SelfShare' | 'AlreadyShared';

  constructor(
    type: 'CourseNotFound' | 'UserNotFound' | 'SelfShare' | 'AlreadyShared',
    message: string
  ) {
    super(message);
    this.type = type;
  }
}
class CourseShareService {
  shareWith = courseShare;
  unshareWith = courseUnshare;
  getUsersWithAccess = courseSharedUsers;
  getSharedCourses = courseSharedCourses;
}
class TaskService {
  listByCourse = mock(async () => []);
  findByIdForUser = mock(async () => null);
  findOverdueByUser = mock(async () => []);
  create = mock(async () => null);
  updateForUser = mock(async () => null);
  deleteForUser = taskDelete;
}
class QuizService {
  listByCourse = mock(async () => []);
  findByIdForOwner = mock(async () => null);
  create = quizCreate;
  updateForOwner = quizUpdate;
  deleteForOwner = quizDelete;
}
class DocumentService {
  listByCourse = documentList;
  readCourseDocuments = documentRead;
}

mock.module('backend/services', () => ({
  CourseService,
  CourseShareService,
  ShareError,
  TaskService,
  QuizService,
  DocumentService,
}));

const { registerTools } = await import('../tools');

interface RecordedTool {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

function mountTools(): RecordedTool[] {
  const recorded: RecordedTool[] = [];
  const server = {
    registerTool: (name: string, _config: unknown, handler: RecordedTool['handler']) => {
      recorded.push({ name, handler });
    },
  };
  registerTools(server as unknown as McpServer);
  return recorded;
}

function handlerFor(name: string) {
  const tool = mountTools().find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not registered`);
  return tool.handler;
}

/** Extracts the text of the first content block, asserting it is a text block. */
function textOf(result: CallToolResult): string {
  const block = result.content[0];
  if (block.type !== 'text') throw new Error('expected a text content block');
  return block.text;
}

const EXPECTED_TOOLS = [
  'list_courses',
  'get_course',
  'create_course',
  'update_course',
  'delete_course',
  'share_course',
  'unshare_course',
  'list_course_shares',
  'list_shared_courses',
  'list_tasks',
  'get_task',
  'list_overdue_tasks',
  'create_task',
  'update_task',
  'delete_task',
  'list_quizzes',
  'get_quiz',
  'create_quiz',
  'update_quiz',
  'delete_quiz',
  'list_documents',
  'read_course_documents',
];

beforeEach(() => {
  for (const m of [
    courseList,
    courseFind,
    courseCreate,
    courseUpdate,
    courseDelete,
    courseShare,
    courseUnshare,
    courseSharedUsers,
    courseSharedCourses,
    taskDelete,
    quizCreate,
    quizUpdate,
    quizDelete,
    documentList,
    documentRead,
  ]) {
    m.mockClear();
  }
});

describe('registerTools', () => {
  it('registers exactly the expected set of tools', () => {
    const names = mountTools().map((t) => t.name);
    expect(names.sort()).toEqual([...EXPECTED_TOOLS].sort());
  });

  it('registers each tool name only once', () => {
    const names = mountTools().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('course tools', () => {
  it('create_course calls CourseService.create(name, userId)', async () => {
    const result = await handlerFor('create_course')({ userId: 'u1', name: 'Biology' });
    expect(courseCreate).toHaveBeenCalledWith('Biology', 'u1');
    expect(textOf(result)).toContain('Biology');
  });

  it('update_course calls updateForOwner(courseId, userId, name)', async () => {
    await handlerFor('update_course')({ userId: 'u1', courseId: 'c1', name: 'Bio 2' });
    expect(courseUpdate).toHaveBeenCalledWith('c1', 'u1', 'Bio 2');
  });

  it('update_course returns a permission message when the service returns null', async () => {
    courseUpdate.mockResolvedValueOnce(null as never);
    const result = await handlerFor('update_course')({ userId: 'u1', courseId: 'x', name: 'n' });
    expect(textOf(result)).toBe('Not found or you do not have permission.');
  });

  it('delete_course returns { deleted } from deleteForOwner', async () => {
    const result = await handlerFor('delete_course')({ userId: 'u1', courseId: 'c1' });
    expect(courseDelete).toHaveBeenCalledWith('c1', 'u1');
    expect(textOf(result)).toBe('{"deleted":true}');
  });

  it('share_course calls shareWith(courseId, userId, usernameOrEmail)', async () => {
    const result = await handlerFor('share_course')({
      userId: 'u1',
      courseId: 'c1',
      usernameOrEmail: ' shared@example.com ',
    });

    expect(courseShare).toHaveBeenCalledWith('c1', 'u1', 'shared@example.com');
    expect(textOf(result)).toContain('"sharedWithUserId": "u2"');
  });

  it('share_course returns share validation errors as tool errors', async () => {
    courseShare.mockRejectedValueOnce(new ShareError('AlreadyShared', 'Already shared') as never);

    const result = await handlerFor('share_course')({
      userId: 'u1',
      courseId: 'c1',
      usernameOrEmail: 'shared',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('Already shared');
  });

  it('unshare_course calls unshareWith(courseId, userId, sharedWithUserId)', async () => {
    const result = await handlerFor('unshare_course')({
      userId: 'u1',
      courseId: 'c1',
      sharedWithUserId: 'u2',
    });

    expect(courseUnshare).toHaveBeenCalledWith('c1', 'u1', 'u2');
    expect(textOf(result)).toBe('{"unshared":true}');
  });

  it('list_course_shares calls getUsersWithAccess(courseId, userId)', async () => {
    const result = await handlerFor('list_course_shares')({ userId: 'u1', courseId: 'c1' });

    expect(courseSharedUsers).toHaveBeenCalledWith('c1', 'u1');
    expect(textOf(result)).toContain('"username": "shared"');
  });

  it('list_shared_courses calls getSharedCourses(userId)', async () => {
    const result = await handlerFor('list_shared_courses')({ userId: 'u1' });

    expect(courseSharedCourses).toHaveBeenCalledWith('u1');
    expect(textOf(result)).toContain('"name": "Physics"');
  });
});

describe('task + quiz write tools', () => {
  it('delete_task calls deleteForUser(taskId, userId)', async () => {
    const result = await handlerFor('delete_task')({ userId: 'u1', taskId: 't1' });
    expect(taskDelete).toHaveBeenCalledWith('t1', 'u1');
    expect(textOf(result)).toBe('{"deleted":true}');
  });

  it('create_quiz calls QuizService.create(data, courseId, userId)', async () => {
    const data = { title: 'Midterm', isOrderRandom: true };
    const result = await handlerFor('create_quiz')({ userId: 'u1', courseId: 'c1', data });
    expect(quizCreate).toHaveBeenCalledWith(data, 'c1', 'u1');
    expect(textOf(result)).toContain('Midterm');
  });

  it('delete_quiz calls deleteForOwner(quizId, userId)', async () => {
    await handlerFor('delete_quiz')({ userId: 'u1', quizId: 'q1' });
    expect(quizDelete).toHaveBeenCalledWith('q1', 'u1');
  });
});

describe('document tools', () => {
  it('read_course_documents calls readCourseDocuments with options', async () => {
    const result = await handlerFor('read_course_documents')({
      userId: 'u1',
      courseId: 'c1',
      documentIds: ['d1'],
      query: 'photosynthesis',
      maxCharacters: 5000,
    });

    expect(documentRead).toHaveBeenCalledWith('c1', 'u1', {
      documentIds: ['d1'],
      query: 'photosynthesis',
      maxCharacters: 5000,
    });
    expect(textOf(result)).toContain('"courseId": "c1"');
  });

  it('read_course_documents returns a permission message when the service rejects access', async () => {
    documentRead.mockRejectedValueOnce(new Error('Course not found.'));

    const result = await handlerFor('read_course_documents')({ userId: 'u1', courseId: 'x' });

    expect(textOf(result)).toBe('Not found or you do not have permission.');
  });
});
