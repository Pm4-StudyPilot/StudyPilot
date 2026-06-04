import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseShareService } from 'backend/services';

const handler = async ({
  userId,
  courseId,
  sharedWithUserId,
}: {
  userId: string;
  courseId: string;
  sharedWithUserId: string;
}): Promise<CallToolResult> => {
  const unshared = await new CourseShareService().unshareWith(courseId, userId, sharedWithUserId);
  return {
    content: [{ type: 'text', text: JSON.stringify({ unshared }) }],
  };
};

export function registerUnshareCourse(server: McpServer): void {
  server.registerTool(
    'unshare_course',
    {
      title: 'Unshare Course',
      description: 'Remove course access from a user. The requesting user must own the course.',
      inputSchema: {
        userId: z.string(),
        courseId: z.string(),
        sharedWithUserId: z.string(),
      } as never,
    },
    handler as never
  );
}
