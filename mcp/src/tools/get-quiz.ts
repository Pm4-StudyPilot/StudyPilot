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
  const quiz = await new QuizService().findByIdForOwner(quizId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(quiz, null, 2) }],
  };
};

export function registerGetQuiz(server: McpServer): void {
  server.registerTool(
    'get_quiz',
    {
      title: 'Get Quiz',
      description: 'Fetch a single quiz by id. The user must own the quiz.',
      inputSchema: { userId: z.string(), quizId: z.string() } as never,
    },
    handler as never
  );
}
