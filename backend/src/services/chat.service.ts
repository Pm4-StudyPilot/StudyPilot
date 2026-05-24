import { runAgent, type AgentReply } from 'agent';

/**
 * Thin wrapper around the TARS LangGraph agent. Kept out of the exported
 * `services/index.ts` barrel so the heavy LangChain dependency tree never
 * leaks into other consumers of `backend/services` (e.g. the MCP server).
 */
export class ChatService {
  async send(message: string, userId: string, threadId: string): Promise<AgentReply> {
    return runAgent({ message, userId, threadId });
  }
}
