import { describe, it, expect } from 'bun:test';
import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';
import { stripUserId, toGeminiSchema, buildAgentTools } from '../tools';
import { usedTools } from '../index';

describe('stripUserId', () => {
  it('removes userId from properties and required', () => {
    const schema = {
      type: 'object',
      properties: { userId: { type: 'string' }, courseId: { type: 'string' } },
      required: ['userId', 'courseId'],
    };

    const result = stripUserId(schema) as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect('userId' in result.properties).toBe(false);
    expect('courseId' in result.properties).toBe(true);
    expect(result.required).toEqual(['courseId']);
  });

  it('leaves schemas without a userId field untouched', () => {
    const schema = { type: 'object', properties: { courseId: { type: 'string' } } };
    expect(stripUserId(schema)).toBe(schema);
  });
});

describe('toGeminiSchema', () => {
  it('flattens nested union type arrays to a single type + nullable', () => {
    const schema = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            description: { type: ['string', 'null'] },
            dueDate: { type: ['string', 'null'] },
            tags: { type: 'array', items: { type: ['string', 'null'] } },
          },
        },
      },
    };

    const result = toGeminiSchema(schema) as {
      properties: { data: { properties: Record<string, Record<string, unknown>> } };
    };

    const data = result.properties.data.properties;
    expect(data.description).toEqual({ type: 'string', nullable: true });
    expect(data.dueDate).toEqual({ type: 'string', nullable: true });
    expect(data.tags.items).toEqual({ type: 'string', nullable: true });
  });

  it('leaves a Gemini-valid schema unchanged in shape', () => {
    const schema = { type: 'object', properties: { q: { type: 'string' } } };
    expect(toGeminiSchema(schema)).toEqual(schema);
  });

  it('removes numeric exclusivity fields unsupported by Gemini', () => {
    const schema = {
      type: 'object',
      properties: {
        maxCharacters: {
          type: 'number',
          exclusiveMinimum: 0,
          exclusiveMaximum: 60001,
        },
      },
    };

    expect(toGeminiSchema(schema)).toEqual({
      type: 'object',
      properties: {
        maxCharacters: {
          type: 'number',
        },
      },
    });
  });
});

describe('buildAgentTools', () => {
  function makeRawTool(record: { args?: Record<string, unknown> }) {
    return tool(
      async (args: Record<string, unknown>) => {
        record.args = args;
        return 'ok';
      },
      {
        name: 'list_courses',
        description: 'List courses',
        schema: {
          type: 'object',
          properties: { userId: { type: 'string' }, q: { type: 'string' } },
          required: ['userId'],
        },
      }
    ) as unknown as DynamicStructuredTool;
  }

  it('hides userId from the model-facing schema', () => {
    const [wrapped] = buildAgentTools([makeRawTool({})]);
    const schema = wrapped.schema as { properties: Record<string, unknown> };
    expect('userId' in schema.properties).toBe(false);
    expect('q' in schema.properties).toBe(true);
  });

  it('injects userId from config into the underlying tool call', async () => {
    const record: { args?: Record<string, unknown> } = {};
    const [wrapped] = buildAgentTools([makeRawTool(record)]);

    await wrapped.invoke({ q: 'biology' }, { configurable: { userId: 'user-1' } });

    expect(record.args).toEqual({ q: 'biology', userId: 'user-1' });
  });

  it('throws when no userId is present in config', async () => {
    const [wrapped] = buildAgentTools([makeRawTool({})]);
    await expect(wrapped.invoke({ q: 'biology' }, { configurable: {} })).rejects.toThrow(/userId/);
  });
});

describe('usedTools', () => {
  it('lists invoked tool names in chronological order', () => {
    const messages = [
      { content: 'hi' },
      { content: '', tool_calls: [{ name: 'list_courses' }] },
      { content: '[]' },
      { content: '', tool_calls: [{ name: 'list_tasks' }, { name: 'get_task' }] },
      { content: 'done' },
    ] as unknown as BaseMessage[];

    expect(usedTools(messages)).toEqual(['list_courses', 'list_tasks', 'get_task']);
  });

  it('returns an empty array when no tools were used', () => {
    const messages = [{ content: 'hi' }, { content: 'just chatting' }] as unknown as BaseMessage[];
    expect(usedTools(messages)).toEqual([]);
  });
});
