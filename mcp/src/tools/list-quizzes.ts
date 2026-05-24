import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { QuizService } from 'backend/services';

const handler = async ({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}): Promise<CallToolResult> => {
  const quizzes = await new QuizService().listByCourse(courseId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(quizzes, null, 2) }],
  };
};

export function registerListQuizzes(server: McpServer): void {
  server.registerTool(
    'list_quizzes',
    {
      title: 'List Quizzes',
      description: 'List all quizzes within a specific course owned by the user.',
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
