import { fileURLToPath } from 'node:url';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { DynamicStructuredTool } from '@langchain/core/tools';

/**
 * Resolves the entry point of the StudyPilot MCP server that this agent spawns.
 *
 * Defaults to the sibling `mcp/` workspace within the monorepo. In bundled
 * deployments (where the relative path no longer holds) set `MCP_SERVER_ENTRY`
 * to an absolute path.
 */
export function resolveMcpEntry(): string {
  if (process.env.MCP_SERVER_ENTRY) {
    return process.env.MCP_SERVER_ENTRY;
  }
  return fileURLToPath(new URL('../../mcp/src/index.ts', import.meta.url));
}

/** Forwards the current environment (DATABASE_URL, etc.) to the spawned MCP server. */
export function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return env;
}

let toolsPromise: Promise<DynamicStructuredTool[]> | null = null;

/**
 * Spawns the StudyPilot MCP server (stdio) once and returns its tools as
 * LangChain tools. The result is memoized so the subprocess/connection is
 * shared across all agent invocations.
 */
export function getMcpTools(): Promise<DynamicStructuredTool[]> {
  if (!toolsPromise) {
    const client = new MultiServerMCPClient({
      mcpServers: {
        studypilot: {
          transport: 'stdio',
          command: 'bun',
          args: [resolveMcpEntry()],
          env: childEnv(),
        },
      },
    });
    toolsPromise = client.getTools() as Promise<DynamicStructuredTool[]>;
  }
  return toolsPromise;
}
