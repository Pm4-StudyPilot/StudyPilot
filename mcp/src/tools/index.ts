import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListCourses } from './list-courses';
import { registerGetCourse } from './get-course';
import { registerCreateCourse } from './create-course';
import { registerUpdateCourse } from './update-course';
import { registerDeleteCourse } from './delete-course';
import { registerShareCourse } from './share-course';
import { registerUnshareCourse } from './unshare-course';
import { registerListCourseShares } from './list-course-shares';
import { registerListSharedCourses } from './list-shared-courses';
import { registerListTasks } from './list-tasks';
import { registerGetTask } from './get-task';
import { registerListOverdueTasks } from './list-overdue-tasks';
import { registerCreateTask } from './create-task';
import { registerUpdateTask } from './update-task';
import { registerDeleteTask } from './delete-task';
import { registerListQuizzes } from './list-quizzes';
import { registerGetQuiz } from './get-quiz';
import { registerCreateQuiz } from './create-quiz';
import { registerAddQuizQuestions } from './add-quiz-questions';
import { registerUpdateQuiz } from './update-quiz';
import { registerDeleteQuiz } from './delete-quiz';
import { registerListDocuments } from './list-documents';
import { registerReadCourseDocuments } from './read-course-documents';

export function registerTools(server: McpServer): void {
  // Courses
  registerListCourses(server);
  registerGetCourse(server);
  registerCreateCourse(server);
  registerUpdateCourse(server);
  registerDeleteCourse(server);
  registerShareCourse(server);
  registerUnshareCourse(server);
  registerListCourseShares(server);
  registerListSharedCourses(server);
  // Tasks
  registerListTasks(server);
  registerGetTask(server);
  registerListOverdueTasks(server);
  registerCreateTask(server);
  registerUpdateTask(server);
  registerDeleteTask(server);
  // Quizzes
  registerListQuizzes(server);
  registerGetQuiz(server);
  registerCreateQuiz(server);
  registerAddQuizQuestions(server);
  registerUpdateQuiz(server);
  registerDeleteQuiz(server);
  // Documents (read-only)
  registerListDocuments(server);
  registerReadCourseDocuments(server);
}
