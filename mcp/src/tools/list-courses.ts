import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseService } from 'backend/services';

const handler = async ({ userId }: { userId: string }): Promise<CallToolResult> => {
  const courseService = new CourseService();
  const courses = await courseService.listByUser(userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }],
  };
};

export function registerListCourses(server: McpServer): void {
  // The SDK's registerTool generics evaluate `ZodRawShapeCompat → ShapeOutput`
  // through a `z3 | z4` union, which TS 5.7 can't resolve within its recursion
  // budget (TS2589). Runtime is correct; types lie. Localized cast keeps the
  // handler body fully typed.
  server.registerTool(
    'list_courses',
    {
      title: 'List Courses',
      description:
        'List all StudyPilot courses owned by or shared with the given user, including task progress.',
      inputSchema: { userId: z.string() } as never,
    },
    handler as never
  );
}
