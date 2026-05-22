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
  const deleted = await new TaskService().deleteForUser(taskId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify({ deleted }) }],
  };
};

export function registerDeleteTask(server: McpServer): void {
  server.registerTool(
    'delete_task',
    {
      title: 'Delete Task',
      description: "Delete one of the user's tasks by id.",
      inputSchema: { userId: z.string(), taskId: z.string() } as never,
    },
    handler as never
  );
}
