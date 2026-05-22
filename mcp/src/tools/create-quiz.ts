import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { QuizService } from 'backend/services';
import type { CreateQuizRequest } from 'backend/types';

const NOT_FOUND = 'Not found or you do not have permission.';

const handler = async ({
  userId,
  courseId,
  data,
}: {
  userId: string;
  courseId: string;
  data: CreateQuizRequest;
}): Promise<CallToolResult> => {
  const quiz = await new QuizService().create(data, courseId, userId);
  return {
    content: [{ type: 'text', text: quiz ? JSON.stringify(quiz, null, 2) : NOT_FOUND }],
  };
};

export function registerCreateQuiz(server: McpServer): void {
  server.registerTool(
    'create_quiz',
    {
      title: 'Create Quiz',
      description: 'Create a quiz in a course. The user must own the course.',
      inputSchema: {
        userId: z.string(),
        courseId: z.string(),
        data: z.object({
          title: z.string(),
          description: z.string().optional(),
          isOrderRandom: z.boolean().optional(),
        }),
      } as never,
    },
    handler as never
  );
}
