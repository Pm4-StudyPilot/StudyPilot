import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseService } from 'backend/services';

const NOT_FOUND = 'Not found or you do not have permission.';

const handler = async ({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}): Promise<CallToolResult> => {
  const course = await new CourseService().findByIdForUser(courseId, userId);
  return {
    content: [{ type: 'text', text: course ? JSON.stringify(course, null, 2) : NOT_FOUND }],
  };
};

export function registerGetCourse(server: McpServer): void {
  server.registerTool(
    'get_course',
    {
      title: 'Get Course',
      description:
        'Fetch a single course by id, including task progress. The user must own or have shared access to the course.',
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
