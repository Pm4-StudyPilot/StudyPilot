import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseService } from 'backend/services';

const NOT_FOUND = 'Not found or you do not have permission.';

const handler = async ({
  userId,
  courseId,
  name,
}: {
  userId: string;
  courseId: string;
  name: string;
}): Promise<CallToolResult> => {
  const course = await new CourseService().updateForOwner(courseId, userId, name);
  return {
    content: [{ type: 'text', text: course ? JSON.stringify(course, null, 2) : NOT_FOUND }],
  };
};

export function registerUpdateCourse(server: McpServer): void {
  server.registerTool(
    'update_course',
    {
      title: 'Update Course',
      description: 'Rename a course. The user must own the course.',
      inputSchema: { userId: z.string(), courseId: z.string(), name: z.string() } as never,
    },
    handler as never
  );
}
