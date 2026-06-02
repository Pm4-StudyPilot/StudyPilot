import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseShareService } from 'backend/services';

const handler = async ({ userId }: { userId: string }): Promise<CallToolResult> => {
  const courses = await new CourseShareService().getSharedCourses(userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }],
  };
};

export function registerListSharedCourses(server: McpServer): void {
  server.registerTool(
    'list_shared_courses',
    {
      title: 'List Shared Courses',
      description: 'List courses shared with the given user.',
      inputSchema: { userId: z.string() } as never,
    },
    handler as never
  );
}
