import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage, MessageContent } from '@langchain/core/messages';
import { getAgent } from './agent';
import type { AgentInput, AgentReply } from './types';

/**
 * Collects the names of every tool the agent invoked, in the order the calls
 * appear in the message history (chronological).
 */
export function usedTools(messages: BaseMessage[]): string[] {
  const tools: string[] = [];
  for (const message of messages) {
    const toolCalls = (message as { tool_calls?: Array<{ name?: string }> }).tool_calls;
    if (Array.isArray(toolCalls)) {
      for (const call of toolCalls) {
        if (call?.name) tools.push(call.name);
      }
    }
  }
  return tools;
}

/** Flattens a LangChain message content (string or content parts) into plain text. */
export function messageText(content: MessageContent | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'object' && part !== null && 'text' in part) {
        return String((part as unknown as { text: unknown }).text);
      }
      return '';
    })
    .join('');
}

/**
 * Runs the TARS agent for a single user turn and returns its final reply.
 * The ReAct loop (reason → tool → observe → …) is handled by the prebuilt
 * agent; `threadId` scopes conversation memory and `userId` is injected into
 * every tool call.
 */
export async function runAgent({ message, userId, threadId }: AgentInput): Promise<AgentReply> {
  const agent = await getAgent();
  const result = await agent.invoke(
    { messages: [new HumanMessage(message)] },
    { configurable: { thread_id: threadId, userId }, recursionLimit: 25 }
  );

  const last = result.messages.at(-1);
  return { reply: messageText(last?.content), tools: usedTools(result.messages) };
}

export type { AgentInput, AgentReply } from './types';
