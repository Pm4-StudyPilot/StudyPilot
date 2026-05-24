import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskService } from 'backend/services';

const handler = async ({ userId }: { userId: string }): Promise<CallToolResult> => {
  const tasks = await new TaskService().findOverdueByUser(userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
  };
};

export function registerListOverdueTasks(server: McpServer): void {
  server.registerTool(
    'list_overdue_tasks',
    {
      title: 'List Overdue Tasks',
      description:
        "List all of the user's tasks across courses that are past their due date and not yet marked DONE. Sorted oldest-first.",
      inputSchema: { userId: z.string() } as never,
    },
    handler as never
  );
}
