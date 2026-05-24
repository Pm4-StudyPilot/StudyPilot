import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskService } from 'backend/services';
import type { UpdateTaskRequest } from 'backend/types';

const handler = async ({
  userId,
  taskId,
  data,
}: {
  userId: string;
  taskId: string;
  data: UpdateTaskRequest;
}): Promise<CallToolResult> => {
  const task = await new TaskService().updateForUser(taskId, userId, data);
  return {
    content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
  };
};

export function registerUpdateTask(server: McpServer): void {
  server.registerTool(
    'update_task',
    {
      title: 'Update Task',
      description:
        "Partially update a task owned by the user. Any field may be omitted. Use this to change a task's status, due date, priority, title, or description.",
      inputSchema: {
        userId: z.string(),
        taskId: z.string(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().nullable().optional(),
          dueDate: z.string().nullable().optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
          status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
        }),
      } as never,
    },
    handler as never
  );
}
