import { describe, it, expect, afterEach } from 'bun:test';
import { getModel } from '../model';

const originalKey = process.env.GOOGLE_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

function restore(key: string | undefined, value: string | undefined) {
  if (value === undefined) delete process.env[key as string];
  else process.env[key as string] = value;
}

afterEach(() => {
  restore('GOOGLE_API_KEY', originalKey);
  restore('GEMINI_MODEL', originalModel);
});

describe('getModel', () => {
  it('throws when GOOGLE_API_KEY is not set', () => {
    delete process.env.GOOGLE_API_KEY;
    expect(() => getModel()).toThrow(/GOOGLE_API_KEY/);
  });

  it('defaults to gemini-3-flash-preview', () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    delete process.env.GEMINI_MODEL;
    expect(getModel().model).toContain('gemini-3-flash-preview');
  });

  it('honors the GEMINI_MODEL override', () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-2.0-flash';
    expect(getModel().model).toContain('gemini-2.0-flash');
  });
});
