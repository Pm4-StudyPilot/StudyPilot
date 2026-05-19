import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListCourses } from './list-courses';
import { registerListTasks } from './list-tasks';
import { registerGetTask } from './get-task';
import { registerListOverdueTasks } from './list-overdue-tasks';
import { registerCreateTask } from './create-task';
import { registerUpdateTask } from './update-task';
import { registerListQuizzes } from './list-quizzes';
import { registerGetQuiz } from './get-quiz';
import { registerListDocuments } from './list-documents';

export function registerTools(server: McpServer): void {
  registerListCourses(server);
  registerListTasks(server);
  registerGetTask(server);
  registerListOverdueTasks(server);
  registerCreateTask(server);
  registerUpdateTask(server);
  registerListQuizzes(server);
  registerGetQuiz(server);
  registerListDocuments(server);
}
