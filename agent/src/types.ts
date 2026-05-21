export interface AgentInput {
  /** The user's message / prompt. */
  message: string;
  /** Authenticated StudyPilot user id; injected into every tool call. */
  userId: string;
  /** Conversation thread id; scopes the checkpointer's memory. */
  threadId: string;
}

export interface AgentReply {
  reply: string;
  /** Names of the tools the agent invoked this turn, in chronological order. */
  tools: string[];
}
