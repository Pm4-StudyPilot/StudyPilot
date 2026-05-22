export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Tools the agent invoked to produce this message, in chronological order. */
  tools?: string[];
}
