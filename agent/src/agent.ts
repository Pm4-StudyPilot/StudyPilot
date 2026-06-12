import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { getModel } from './model';
import { getMcpTools } from './mcp';
import { buildAgentTools } from './tools';
import { buildGenerateQuizTool } from './quiz-agent';
import { buildSystemPrompt } from './prompt';

async function build() {
  const wrapped = buildAgentTools(await getMcpTools());
  const tools = [...wrapped, buildGenerateQuizTool(wrapped)];
  return createReactAgent({
    llm: getModel(),
    tools,
    checkpointer: new MemorySaver(),
    // Function form: re-evaluated each LLM call so the current date stays fresh
    // and is never persisted into the checkpointed message history.
    prompt: (state) => [{ role: 'system', content: buildSystemPrompt() }, ...state.messages],
  });
}

let agentPromise: ReturnType<typeof build> | null = null;

/**
 * Lazily builds and memoizes the TARS ReAct agent (model + MCP tools +
 * in-memory checkpointer). Reused across requests; per-request `userId` and
 * `thread_id` are supplied through the invoke config.
 */
export function getAgent() {
  if (!agentPromise) {
    agentPromise = build();
  }
  return agentPromise;
}
