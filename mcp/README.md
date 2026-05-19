# @studypilot/mcp

StudyPilot's Model Context Protocol server. Exposes StudyPilot capabilities (courses, documents, quizzes, etc.) as MCP tools and resources for consumption by MCP-compatible clients (Claude Desktop, Claude Code, custom agents).

**Current status:** scaffold only. Server boots, registers with the protocol, and exposes **zero tools**. Tools and resources will be added in subsequent iterations.

## Running

```bash
# from repo root
npm run dev --workspace=@studypilot/mcp

# or directly
bun --cwd mcp src/index.ts
```

The server communicates over **stdio** — it reads JSON-RPC requests from `stdin` and writes responses to `stdout`. All logging is sent to `stderr`. Never write to `stdout` from this server's code: it will corrupt the protocol stream.

## Registering with Claude Code

Add to your project-scoped `.mcp.json` at the repo root (or to `~/.claude.json` for user-scope):

```json
{
  "mcpServers": {
    "studypilot": {
      "command": "bun",
      "args": ["--cwd", "/Users/anes/private/StudyPilot/mcp", "src/index.ts"]
    }
  }
}
```

Restart Claude Code, then run `/mcp` (or open the MCP panel) — `studypilot` should appear as **connected** with **0 tools**.

## Registering with Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "studypilot": {
      "command": "bun",
      "args": ["--cwd", "/Users/anes/private/StudyPilot/mcp", "src/index.ts"]
    }
  }
}
```

Restart Claude Desktop and the server will appear in the MCP integrations list.

## Protocol notes

The MCP SDK (`@modelcontextprotocol/sdk`) handles the JSON-RPC 2.0 wire protocol end-to-end: message framing, parsing, request/response correlation, error envelopes, and notifications. Our code only registers typed handlers; we never construct or parse JSON-RPC payloads by hand.
