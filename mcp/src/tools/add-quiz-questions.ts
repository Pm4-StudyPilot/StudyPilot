import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { QuestionService } from 'backend/services';
import type { CreateQuestionWithAnswersRequest } from 'backend/types';

const NOT_FOUND = 'Not found or you do not have permission.';

const handler = async ({
  userId,
  quizId,
  questions,
}: {
  userId: string;
  quizId: string;
  questions: CreateQuestionWithAnswersRequest[];
}): Promise<CallToolResult> => {
  try {
    const created = await new QuestionService().createManyWithAnswers(quizId, userId, questions);
    return {
      content: [{ type: 'text', text: created ? JSON.stringify(created, null, 2) : NOT_FOUND }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
      isError: true,
    };
  }
};

export function registerAddQuizQuestions(server: McpServer): void {
  server.registerTool(
    'add_quiz_questions',
    {
      title: 'Add Quiz Questions',
      description:
        'Add many questions (each with its answers) to an existing quiz in one atomic call. ' +
        'Answer rules per type: SINGLE_CHOICE needs >=2 answers with exactly one correct; ' +
        'MULTIPLE_CHOICE needs >=2 answers with at least one correct; CARD needs >=1 answer ' +
        '(the card back). The user must own the quiz’s course.',
      inputSchema: {
        userId: z.string(),
        quizId: z.string(),
        questions: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            type: z.enum(['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'CARD']),
            answers: z.array(
              z.object({
                content: z.string(),
                isCorrect: z.boolean(),
              })
            ),
          })
        ),
      } as never,
    },
    handler as never
  );
}
