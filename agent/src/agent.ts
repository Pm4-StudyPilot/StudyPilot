import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { getModel } from './model';
import { getMcpTools } from './mcp';
import { buildAgentTools } from './tools';
import { TARS_SYSTEM_PROMPT } from './prompt';

async function build() {
  const tools = buildAgentTools(await getMcpTools());
  return createReactAgent({
    llm: getModel(),
    tools,
    checkpointer: new MemorySaver(),
    prompt: TARS_SYSTEM_PROMPT,
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
