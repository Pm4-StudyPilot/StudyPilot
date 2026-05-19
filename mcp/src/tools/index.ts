import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListCourses } from './list-courses';

export function registerTools(server: McpServer): void {
  registerListCourses(server);
}
