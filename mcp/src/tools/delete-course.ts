import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseService } from 'backend/services';

const handler = async ({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}): Promise<CallToolResult> => {
  const action = await new CourseService().removeForUser(courseId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify({ action }) }],
  };
};

export function registerDeleteCourse(server: McpServer): void {
  server.registerTool(
    'delete_course',
    {
      title: 'Delete Course',
      description:
        'Delete a course when the user owns it, or leave a shared course when the user has shared access.',
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
