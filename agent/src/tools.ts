import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';

interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Removes the `userId` field from a tool's JSON input schema so the LLM never
 * sees or tries to populate it. The real `userId` is injected at call time
 * from the authenticated request (see {@link buildAgentTools}).
 */
export function stripUserId(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  const s = schema as JsonSchemaObject;
  if (!s.properties || !('userId' in s.properties)) return schema;

  const { userId: _omitted, ...properties } = s.properties;
  return {
    ...s,
    properties,
    required: Array.isArray(s.required) ? s.required.filter((key) => key !== 'userId') : s.required,
  };
}

/**
 * Rewrites a JSON schema so the Gemini function-declaration validator accepts
 * it. Gemini does not allow union `type` arrays (e.g. `["string", "null"]`),
 * which the MCP tools emit for nullable/optional fields. This collapses such
 * unions to a single `type` plus `nullable: true`, recursing through nested
 * schemas. Leaves Gemini-valid schemas untouched.
 */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(toGeminiSchema);
  }
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const node: Record<string, unknown> = { ...(schema as Record<string, unknown>) };

  delete node.exclusiveMinimum;
  delete node.exclusiveMaximum;

  if (Array.isArray(node.type)) {
    const types = (node.type as unknown[]).filter((t) => t !== 'null');
    if ((node.type as unknown[]).includes('null')) {
      node.nullable = true;
    }
    node.type = (types[0] as string | undefined) ?? 'string';
  }

  if (node.properties && typeof node.properties === 'object') {
    const props = node.properties as Record<string, unknown>;
    node.properties = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [key, toGeminiSchema(value)])
    );
  }
  if (node.items) {
    node.items = toGeminiSchema(node.items);
  }
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    if (Array.isArray(node[key])) {
      node[key] = (node[key] as unknown[]).map(toGeminiSchema);
    }
  }

  return node;
}

/**
 * Wraps each raw MCP tool so that:
 * - its model-facing schema has `userId` stripped, and
 * - the authenticated `userId` (from `config.configurable.userId`) is injected
 *   into the actual tool call.
 */
export function buildAgentTools(rawTools: DynamicStructuredTool[]): DynamicStructuredTool[] {
  return rawTools.map((raw) => {
    const wrapped = tool(
      async (args: Record<string, unknown>, config?: RunnableConfig) => {
        const userId = (config?.configurable as { userId?: string } | undefined)?.userId;
        if (!userId) {
          throw new Error(`Missing userId in agent config for tool "${raw.name}".`);
        }
        return raw.invoke({ ...args, userId } as Record<string, unknown>, config);
      },
      {
        name: raw.name,
        description: raw.description,
        schema: toGeminiSchema(stripUserId(raw.schema)) as Record<string, unknown>,
      }
    );
    return wrapped as unknown as DynamicStructuredTool;
  });
}
