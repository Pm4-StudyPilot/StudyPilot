import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DocumentService } from 'backend/services';

const handler = async ({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}): Promise<CallToolResult> => {
  const documents = await new DocumentService().listByCourse(courseId, userId, {});
  return {
    content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }],
  };
};

export function registerListDocuments(server: McpServer): void {
  server.registerTool(
    'list_documents',
    {
      title: 'List Documents',
      description:
        'List documents (metadata only — no file contents) uploaded to a course. The user must own or have shared access.',
      inputSchema: { userId: z.string(), courseId: z.string() } as never,
    },
    handler as never
  );
}
