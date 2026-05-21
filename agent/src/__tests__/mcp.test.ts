import { describe, it, expect, afterEach } from 'bun:test';
import { resolveMcpEntry, childEnv } from '../mcp';

const originalEntry = process.env.MCP_SERVER_ENTRY;

afterEach(() => {
  if (originalEntry === undefined) delete process.env.MCP_SERVER_ENTRY;
  else process.env.MCP_SERVER_ENTRY = originalEntry;
});

describe('resolveMcpEntry', () => {
  it('returns MCP_SERVER_ENTRY when set', () => {
    process.env.MCP_SERVER_ENTRY = '/opt/studypilot/mcp/index.ts';
    expect(resolveMcpEntry()).toBe('/opt/studypilot/mcp/index.ts');
  });

  it('falls back to the sibling mcp workspace entry', () => {
    delete process.env.MCP_SERVER_ENTRY;
    expect(resolveMcpEntry()).toMatch(/mcp\/src\/index\.ts$/);
  });
});

describe('childEnv', () => {
  it('forwards defined env vars as a string record', () => {
    process.env.MCP_SERVER_ENTRY = '/tmp/entry.ts';
    const env = childEnv();
    expect(env.MCP_SERVER_ENTRY).toBe('/tmp/entry.ts');
    expect(Object.values(env).every((v) => typeof v === 'string')).toBe(true);
  });
});
