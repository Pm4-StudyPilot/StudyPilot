import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { QuizService } from 'backend/services';

const handler = async ({
  userId,
  quizId,
}: {
  userId: string;
  quizId: string;
}): Promise<CallToolResult> => {
  const deleted = await new QuizService().deleteForOwner(quizId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify({ deleted }) }],
  };
};

export function registerDeleteQuiz(server: McpServer): void {
  server.registerTool(
    'delete_quiz',
    {
      title: 'Delete Quiz',
      description:
        'Delete a quiz by id, including its questions and answers. The user must own the course the quiz belongs to.',
      inputSchema: { userId: z.string(), quizId: z.string() } as never,
    },
    handler as never
  );
}
