import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseService } from 'backend/services';

const handler = async ({
  userId,
  name,
}: {
  userId: string;
  name: string;
}): Promise<CallToolResult> => {
  const course = await new CourseService().create(name, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(course, null, 2) }],
  };
};

export function registerCreateCourse(server: McpServer): void {
  server.registerTool(
    'create_course',
    {
      title: 'Create Course',
      description: 'Create a new course owned by the user.',
      inputSchema: { userId: z.string(), name: z.string() } as never,
    },
    handler as never
  );
}
