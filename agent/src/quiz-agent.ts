import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { getModel } from './model';
import { messageText } from './index';

/** Tools the quiz sub-agent is allowed to use: read the course material, then persist. */
const QUIZ_TOOL_NAMES = [
  'get_course',
  'list_documents',
  'read_course_documents',
  'list_tasks',
  'list_overdue_tasks',
  'create_quiz',
  'add_quiz_questions',
];

export const QUIZ_GENERATION_PROMPT = `You are TARS's quiz generator. Your only job is to create ONE quiz for the given course, then stop.

Process (a focused ReAct loop):
1. Read the course's material with \`read_course_documents\` (use \`list_documents\` first if you need to see what exists). Optionally check \`list_tasks\`/\`list_overdue_tasks\` to weight topics the student is actively working on.
2. Design the questions from what you actually read — never invent facts that aren't in the material. If there is little or no material, generate fewer questions from the course name/tasks and say so in your summary.
3. Create the quiz shell with \`create_quiz\` (a clear title and short description).
4. Persist ALL questions in ONE \`add_quiz_questions\` call using the quiz id you just created.
5. Finish with a single short sentence summarising what you made (title + question count). Do not list every question.

Quiz design:
- Aim for ~20 questions unless the request asks for a different count.
- Use a mix of types unless told otherwise:
  - SINGLE_CHOICE: 3-5 answers, exactly ONE marked isCorrect.
  - MULTIPLE_CHOICE: 3-5 answers, at least one (usually 2-3) marked isCorrect.
  - CARD: a flashcard — the question title is the prompt/front, and a single answer holds the back/explanation (isCorrect: true).
- Keep questions clear and self-contained; vary difficulty.

Persisting (\`add_quiz_questions\`) — these rules are enforced and a violation rejects the whole batch:
- SINGLE_CHOICE: >=2 answers, exactly one isCorrect.
- MULTIPLE_CHOICE: >=2 answers, >=1 isCorrect.
- CARD: >=1 answer.
- Every answer must have non-empty content.`;

let subAgentPromise: ReturnType<typeof createReactAgent> | null = null;

function getSubAgent(tools: DynamicStructuredTool[]) {
  if (!subAgentPromise) {
    subAgentPromise = Promise.resolve(
      createReactAgent({
        llm: getModel(),
        tools,
        prompt: QUIZ_GENERATION_PROMPT,
      })
    );
  }
  return subAgentPromise;
}

/**
 * Builds the `generate_quiz` tool exposed to the main TARS agent. When the main
 * agent calls it, this spins up a dedicated ReAct loop (its own prompt + a
 * read/write tool subset) that gathers the course's material and writes a full
 * quiz. The authenticated `userId` is read from the main agent's config and
 * forwarded so the inner tools stay scoped to the same user.
 */
export function buildGenerateQuizTool(
  wrappedTools: DynamicStructuredTool[]
): DynamicStructuredTool {
  const subTools = wrappedTools.filter((t) => QUIZ_TOOL_NAMES.includes(t.name));

  const generateQuiz = tool(
    async (
      args: { courseId: string; focus?: string; questionCount?: number },
      config?: RunnableConfig
    ) => {
      const userId = (config?.configurable as { userId?: string } | undefined)?.userId;
      if (!userId) {
        throw new Error('Missing userId in agent config for tool "generate_quiz".');
      }

      const instructions = [
        `Generate a quiz for course ${args.courseId}.`,
        args.questionCount ? `Target ${args.questionCount} questions.` : '',
        args.focus ? `Focus on: ${args.focus}.` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const agent = await getSubAgent(subTools);
      const result = await agent.invoke(
        { messages: [new HumanMessage(instructions)] },
        { configurable: { userId, thread_id: `quizgen-${args.courseId}` }, recursionLimit: 40 }
      );

      const last = result.messages.at(-1);
      return messageText(last?.content);
    },
    {
      name: 'generate_quiz',
      description:
        "Generate a full quiz from a course's uploaded materials and tasks. Resolve the course id " +
        'first (ask the student which course if unclear). This runs a dedicated process that reads ' +
        'the material and writes the questions — do not write quiz questions yourself.',
      schema: z.object({
        courseId: z.string().describe('The id of the course to generate the quiz for.'),
        focus: z.string().optional().describe('Optional topic/instruction to focus the quiz on.'),
        questionCount: z
          .number()
          .optional()
          .describe('Optional desired number of questions (defaults to ~20).'),
      }),
    }
  );

  return generateQuiz as unknown as DynamicStructuredTool;
}
