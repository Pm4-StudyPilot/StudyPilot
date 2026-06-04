import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CourseShareService, ShareError } from 'backend/services';

const handler = async ({
  userId,
  courseId,
  usernameOrEmail,
}: {
  userId: string;
  courseId: string;
  usernameOrEmail: string;
}): Promise<CallToolResult> => {
  try {
    const share = await new CourseShareService().shareWith(
      courseId,
      userId,
      usernameOrEmail.trim()
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(share, null, 2) }],
    };
  } catch (error: unknown) {
    if (error instanceof ShareError) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }

    throw error;
  }
};

export function registerShareCourse(server: McpServer): void {
  server.registerTool(
    'share_course',
    {
      title: 'Share Course',
      description:
        'Share a course owned by the user with another StudyPilot user by username or email.',
      inputSchema: {
        userId: z.string(),
        courseId: z.string(),
        usernameOrEmail: z.string(),
      } as never,
    },
    handler as never
  );
}
