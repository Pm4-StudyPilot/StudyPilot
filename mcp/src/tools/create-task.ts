import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskService } from 'backend/services';
import type { CreateTaskRequest } from 'backend/types';

const handler = async ({
  userId,
  courseId,
  data,
}: {
  userId: string;
  courseId: string;
  data: CreateTaskRequest;
}): Promise<CallToolResult> => {
  const task = await new TaskService().create(data, courseId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
  };
};

export function registerCreateTask(server: McpServer): void {
  server.registerTool(
    'create_task',
    {
      title: 'Create Task',
      description:
        'Create a new task in a course on behalf of the user. The user must own or have shared access to the course.',
      inputSchema: {
        userId: z.string(),
        courseId: z.string(),
        data: z.object({
          title: z.string(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        }),
      } as never,
    },
    handler as never
  );
}
