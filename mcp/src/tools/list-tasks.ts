import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskService } from 'backend/services';

const handler = async ({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}): Promise<CallToolResult> => {
  const tasks = await new TaskService().listByCourse(courseId, userId);
  return {
    content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
  };
};

export function registerListTasks(server: McpServer): void {
  server.registerTool(
    'list_tasks',
    {
      title: 'List Tasks',
      description: "List tasks within a specific course for the given user (the user's own tasks).",
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
