export interface AgentInput {
  /** The user's message / prompt. */
  message: string;
  /** Authenticated StudyPilot user id; injected into every tool call. */
  userId: string;
  /** Conversation thread id; scopes the checkpointer's memory. */
  threadId: string;
  /**
   * Description of the page the user is on. Only set on the first message of
   * a thread — once it lands in the checkpointed history, follow-up turns
   * inherit it automatically.
   */
  pageContext?: string;
}

export interface AgentReply {
  reply: string;
  /** Names of the tools the agent invoked this turn, in chronological order. */
  tools: string[];
}
