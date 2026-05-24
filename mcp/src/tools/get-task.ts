import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskService } from 'backend/services';

const handler = async ({
  userId,
  taskId,
}: {
  userId: string;
  taskId: string;
}): Promise<CallToolResult> => {
  const task = await new TaskService().findByIdForUser(taskId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
  };
};

export function registerGetTask(server: McpServer): void {
  server.registerTool(
    'get_task',
    {
      title: 'Get Task',
      description: 'Fetch a single task by id, scoped to the given user.',
      inputSchema: { userId: z.string(), taskId: z.string() } as never,
    },
    handler as never
  );
}
