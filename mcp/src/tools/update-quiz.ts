import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { QuizService } from 'backend/services';
import type { UpdateQuizRequest } from 'backend/types';

const NOT_FOUND = 'Not found or you do not have permission.';

const handler = async ({
  userId,
  quizId,
  data,
}: {
  userId: string;
  quizId: string;
  data: UpdateQuizRequest;
}): Promise<CallToolResult> => {
  const quiz = await new QuizService().updateForOwner(quizId, userId, data);
  return {
    content: [{ type: 'text', text: quiz ? JSON.stringify(quiz, null, 2) : NOT_FOUND }],
  };
};

export function registerUpdateQuiz(server: McpServer): void {
  server.registerTool(
    'update_quiz',
    {
      title: 'Update Quiz',
      description:
        'Partially update a quiz (title, description, or random order). Any field may be omitted. The user must own the course the quiz belongs to.',
      inputSchema: {
        userId: z.string(),
        quizId: z.string(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().nullable().optional(),
          isOrderRandom: z.boolean().optional(),
        }),
      } as never,
    },
    handler as never
  );
}
