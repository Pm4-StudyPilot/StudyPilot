import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools';

const server = new McpServer({
  name: 'studypilot-mcp',
  version: '0.1.0',
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('[studypilot-mcp] connected via stdio');
