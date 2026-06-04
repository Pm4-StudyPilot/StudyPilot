import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseShareService } from 'backend/services';

const handler = async ({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}): Promise<CallToolResult> => {
  const users = await new CourseShareService().getUsersWithAccess(courseId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(users, null, 2) }],
  };
};

export function registerListCourseShares(server: McpServer): void {
  server.registerTool(
    'list_course_shares',
    {
      title: 'List Course Shares',
      description: 'List users a course is shared with. The requesting user must own the course.',
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
