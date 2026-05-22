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
  const deleted = await new CourseService().deleteForOwner(courseId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify({ deleted }) }],
  };
};

export function registerDeleteCourse(server: McpServer): void {
  server.registerTool(
    'delete_course',
    {
      title: 'Delete Course',
      description:
        'Delete a course and all of its tasks, quizzes, and documents. The user must own the course.',
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
