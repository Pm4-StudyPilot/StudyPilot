import { describe, it, expect } from 'bun:test';
import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { buildGenerateQuizTool } from '../quiz-agent';

function fakeTool(name: string): DynamicStructuredTool {
  return tool(async () => 'ok', {
    name,
    description: name,
    schema: z.object({}),
  }) as unknown as DynamicStructuredTool;
}

describe('buildGenerateQuizTool', () => {
  const wrapped = [
    'list_courses',
    'get_course',
    'list_documents',
    'read_course_documents',
    'list_tasks',
    'list_overdue_tasks',
    'create_quiz',
    'add_quiz_questions',
    'delete_quiz',
  ].map(fakeTool);

  it('exposes a generate_quiz tool whose schema requires courseId', () => {
    const generateQuiz = buildGenerateQuizTool(wrapped);
    expect(generateQuiz.name).toBe('generate_quiz');

    const schema = generateQuiz.schema as z.ZodTypeAny;
    expect(schema.safeParse({ courseId: 'c1' }).success).toBe(true);
    expect(schema.safeParse({ courseId: 'c1', focus: 'cells', questionCount: 10 }).success).toBe(
      true
    );
    expect(schema.safeParse({ focus: 'cells' }).success).toBe(false);
  });

  it('throws when invoked without a userId in config', async () => {
    const generateQuiz = buildGenerateQuizTool(wrapped);
    await expect(generateQuiz.invoke({ courseId: 'c1' }, { configurable: {} })).rejects.toThrow(
      /userId/
    );
  });
});
