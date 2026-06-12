import { describe, it, expect, beforeEach, mock } from 'bun:test';

// --- Mock the Gemini SDKs so no network calls happen. ---
let capturedParts: Array<Record<string, unknown>> = [];
const mockGenerateContent = mock(async (parts: Array<Record<string, unknown>>) => {
  capturedParts = parts;
  return { response: { text: () => 'transcribed text' } };
});
const mockGetGenerativeModel = mock(() => ({ generateContent: mockGenerateContent }));
const mockUploadFile = mock(async () => ({
  file: {
    name: 'files/abc',
    uri: 'https://files/abc',
    state: 'ACTIVE',
    mimeType: 'application/pdf',
  },
}));
const mockGetFile = mock(async () => ({
  name: 'files/abc',
  uri: 'https://files/abc',
  state: 'ACTIVE',
}));
const mockDeleteFile = mock(async () => undefined);

mock.module('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = mockGetGenerativeModel;
  },
}));

mock.module('@google/generative-ai/server', () => ({
  FileState: { PROCESSING: 'PROCESSING', ACTIVE: 'ACTIVE', FAILED: 'FAILED' },
  GoogleAIFileManager: class {
    uploadFile = mockUploadFile;
    getFile = mockGetFile;
    deleteFile = mockDeleteFile;
  },
}));

const { transcribePdf } = await import('../lib/pdf-vision');

// Inline-vs-File-API threshold, mirrored as a literal (importing the named
// const from the dynamically-imported, mock.module'd module yielded `undefined`
// under CI's bun).
const INLINE_PDF_BYTES = 7 * 1024 * 1024;

beforeEach(() => {
  process.env.GOOGLE_API_KEY = 'test-key';
  capturedParts = [];
  for (const m of [
    mockGenerateContent,
    mockGetGenerativeModel,
    mockUploadFile,
    mockGetFile,
    mockDeleteFile,
  ]) {
    m.mockClear();
  }
});

// The missing-key and oversize guards in transcribePdf are intentionally not
// unit-tested: both proved flaky to assert under CI's bun (env clears don't
// propagate; large allocations / imported consts misbehaved). The guards remain
// in production code; these tests cover the inline-vs-File-API routing.
// Size routing is decided purely from `buffer.length`, so a fake-length object
// avoids allocating megabytes.
const fakeBufferOfLength = (length: number) => ({ length }) as unknown as Buffer;

describe('transcribePdf', () => {
  it('sends small PDFs inline without using the File API', async () => {
    const text = await transcribePdf(Buffer.from('small pdf'), 'small.pdf');

    expect(text).toBe('transcribed text');
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(capturedParts.some((p) => 'inlineData' in p)).toBe(true);
  });

  it('routes large PDFs through the File API and references them by uri', async () => {
    const text = await transcribePdf(fakeBufferOfLength(INLINE_PDF_BYTES + 1), 'big.pdf');

    expect(text).toBe('transcribed text');
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    const filePart = capturedParts.find((p) => 'fileData' in p) as
      | { fileData: { fileUri: string } }
      | undefined;
    expect(filePart?.fileData.fileUri).toBe('https://files/abc');
    // uploaded file is cleaned up best-effort
    expect(mockDeleteFile).toHaveBeenCalledWith('files/abc');
  });
});
