import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DocumentService } from 'backend/services';

const NOT_FOUND = 'Not found or you do not have permission.';

const handler = async ({
  userId,
  courseId,
  documentIds,
  query,
  maxCharacters,
}: {
  userId: string;
  courseId: string;
  documentIds?: string[];
  query?: string;
  maxCharacters?: number;
}): Promise<CallToolResult> => {
  try {
    const result = await new DocumentService().readCourseDocuments(courseId, userId, {
      documentIds,
      query,
      maxCharacters,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Course not found.') {
      return {
        content: [{ type: 'text', text: NOT_FOUND }],
      };
    }

    throw error;
  }
};

export function registerReadCourseDocuments(server: McpServer): void {
  server.registerTool(
    'read_course_documents',
    {
      title: 'Read Course Documents',
      description:
        'Read extracted text chunks from documents uploaded to a course. Optionally narrow to document ids from list_documents and provide a query to rank relevant chunks. The user must own or have shared access.',
      inputSchema: {
        userId: z.string(),
        courseId: z.string(),
        documentIds: z.array(z.string()).optional(),
        query: z.string().optional(),
        maxCharacters: z.number().int().min(1).max(60000).optional(),
      } as never,
    },
    handler as never
  );
}
