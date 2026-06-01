import { APIRequestContext, expect } from '@playwright/test';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'CARD';

export interface Course {
  id: string;
  name: string;
  color: string | null;
}
export interface Task {
  id: string;
  title: string;
  position: number;
  status: string;
  priority: string;
  dueDate: string | null;
}
export interface Quiz {
  id: string;
  title: string;
  isOrderRandom: boolean;
}
export interface Answer {
  id: string;
  content: string;
  isCorrect: boolean;
}
export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  answers: Answer[];
}

export interface AnswerSpec {
  content: string;
  isCorrect: boolean;
}
export interface QuestionSpec {
  title: string;
  type: QuestionType;
  description?: string;
  answers: AnswerSpec[];
}

export interface User {
  id: string;
  username: string;
  email: string;
}

let counter = 0;

/**
 * Creates and tracks test-owned data through the backend API so that every
 * spec runs in isolation. Resources are uniquely named (so parallel specs that
 * share the E2E user never collide) and torn down via `cleanup()` — deleting a
 * course cascades to its tasks, quizzes, questions, answers, and documents.
 */
export class DataFactory {
  private readonly createdCourseIds: string[] = [];

  constructor(private readonly api: APIRequestContext) {}

  /** A label-safe, unique-per-call suffix. */
  unique(prefix: string): string {
    counter += 1;
    return `${prefix} ${Date.now().toString(36)}-${counter}`;
  }

  async createCourse(overrides: { name?: string; color?: string } = {}): Promise<Course> {
    const body = {
      name: overrides.name ?? this.unique('E2E Course'),
      color: overrides.color ?? '#6C63FF',
    };
    const res = await this.api.post('/api/courses', { data: body });
    expect(res.ok(), `createCourse failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    const course = (await res.json()) as Course;
    this.createdCourseIds.push(course.id);
    return course;
  }

  async listCourses(): Promise<Course[]> {
    const res = await this.api.get('/api/courses');
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as Course[];
  }

  /** Deletes a course by id and stops tracking it (for agent-created courses). */
  async deleteCourse(id: string): Promise<void> {
    await this.api.delete(`/api/courses/${id}`).catch(() => {});
    const idx = this.createdCourseIds.indexOf(id);
    if (idx >= 0) this.createdCourseIds.splice(idx, 1);
  }

  async createTask(
    courseId: string,
    overrides: { title?: string; description?: string; dueDate?: string; priority?: string } = {}
  ): Promise<Task> {
    const body = {
      title: overrides.title ?? this.unique('E2E Task'),
      description: overrides.description,
      dueDate: overrides.dueDate,
      priority: overrides.priority ?? 'MEDIUM',
    };
    const res = await this.api.post(`/api/courses/${courseId}/tasks`, { data: body });
    expect(res.ok(), `createTask failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    return (await res.json()) as Task;
  }

  /** Updates a task (used to set status/priority/dueDate, which create cannot). */
  async updateTask(courseId: string, taskId: string, data: Record<string, unknown>): Promise<Task> {
    const res = await this.api.patch(`/api/courses/${courseId}/tasks/${taskId}`, { data });
    expect(res.ok(), `updateTask failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    return (await res.json()) as Task;
  }

  async listTasks(courseId: string): Promise<Task[]> {
    const res = await this.api.get(`/api/courses/${courseId}/tasks`);
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as Task[];
  }

  async createQuiz(
    courseId: string,
    overrides: { title?: string; description?: string; isOrderRandom?: boolean } = {}
  ): Promise<Quiz> {
    const body = {
      title: overrides.title ?? this.unique('E2E Quiz'),
      description: overrides.description ?? 'Created by E2E',
      isOrderRandom: overrides.isOrderRandom ?? false,
    };
    const res = await this.api.post(`/api/courses/${courseId}/quizzes`, { data: body });
    expect(res.ok(), `createQuiz failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    return (await res.json()) as Quiz;
  }

  async listQuestions(courseId: string, quizId: string): Promise<Question[]> {
    const res = await this.api.get(`/api/courses/${courseId}/quizzes/${quizId}/questions`);
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as Question[];
  }

  async getQuiz(courseId: string, quizId: string): Promise<Quiz> {
    const res = await this.api.get(`/api/courses/${courseId}/quizzes/${quizId}`);
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as Quiz;
  }

  /** Builds a full quiz (questions + answers) for play-through specs. */
  async createQuizWithQuestions(
    courseId: string,
    questions: QuestionSpec[],
    quizOverrides: { title?: string; isOrderRandom?: boolean } = {}
  ): Promise<{ quiz: Quiz; questions: Question[] }> {
    const quiz = await this.createQuiz(courseId, quizOverrides);
    const created: Question[] = [];

    for (const spec of questions) {
      const qRes = await this.api.post(`/api/courses/${courseId}/quizzes/${quiz.id}/questions`, {
        data: { title: spec.title, description: spec.description, type: spec.type },
      });
      expect(
        qRes.ok(),
        `createQuestion failed: ${qRes.status()} ${await qRes.text()}`
      ).toBeTruthy();
      const question = (await qRes.json()) as Question;

      const answers: Answer[] = [];
      for (const answer of spec.answers) {
        const aRes = await this.api.post(
          `/api/courses/${courseId}/quizzes/${quiz.id}/questions/${question.id}/answers`,
          { data: { content: answer.content, isCorrect: answer.isCorrect } }
        );
        expect(
          aRes.ok(),
          `createAnswer failed: ${aRes.status()} ${await aRes.text()}`
        ).toBeTruthy();
        answers.push((await aRes.json()) as Answer);
      }
      created.push({ ...question, answers });
    }

    return { quiz, questions: created };
  }

  async uploadDocument(
    courseId: string,
    file: { name: string; mimeType: string; content: string | Buffer }
  ): Promise<{ id: string; filename: string }> {
    const buffer = typeof file.content === 'string' ? Buffer.from(file.content) : file.content;
    const res = await this.api.post('/api/documents', {
      multipart: {
        courseId,
        file: { name: file.name, mimeType: file.mimeType, buffer },
      },
    });
    expect(res.ok(), `uploadDocument failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    return (await res.json()) as { id: string; filename: string };
  }

  async listDocuments(courseId: string): Promise<Array<{ id: string; filename: string }>> {
    const res = await this.api.get(`/api/documents/course/${courseId}`);
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as Array<{ id: string; filename: string }>;
  }

  /** Deletes all tracked courses (cascades to their child resources). */
  async cleanup(): Promise<void> {
    await Promise.all(
      this.createdCourseIds
        .splice(0)
        .map((id) => this.api.delete(`/api/courses/${id}`).catch(() => {}))
    );
  }

  /** Create a test user for shared course tests */
  async createUser(
    overrides: { username?: string; email?: string; password?: string } = {}
  ): Promise<User> {
    const password = overrides.password ?? 'TestPass123!';
    // Generate unique suffix without spaces for email compatibility
    counter += 1;
    const uniqueSuffix = `${Date.now().toString(36)}-${counter}`;
    const body = {
      username: overrides.username ?? this.unique('e2e_share_user'),
      email: overrides.email ?? `e2e${uniqueSuffix}@test.com`,
      password,
    };
    const res = await this.api.post('/api/auth/register', { data: body });
    expect(res.ok(), `createUser failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    const user = (await res.json()) as { user: User };
    return user.user;
  }

  /** Share a course with a user by username/email */
  async shareCourse(
    courseId: string,
    targetUsername: string
  ): Promise<{ courseId: string; sharedWithUserId: string }> {
    const res = await this.api.post(`/api/courses/${courseId}/share`, {
      data: { username: targetUsername },
    });
    expect(res.ok(), `shareCourse failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    return (await res.json()) as { courseId: string; sharedWithUserId: string };
  }
}
