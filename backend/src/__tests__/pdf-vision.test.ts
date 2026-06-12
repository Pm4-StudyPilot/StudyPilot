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

// Mirror the production thresholds as literals. We intentionally do NOT import
// them: under CI's bun, destructuring these named consts from a dynamically
// imported (and mock.module'd) module yielded `undefined`, which silently broke
// the size-routing assertions.
const MAX_PDF_BYTES = 50 * 1024 * 1024;
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

// Note: the "missing GOOGLE_API_KEY" guard in requireApiKey is intentionally not
// unit-tested. It requires *clearing* the env var, which bun's process.env does
// not reliably propagate to later reads (works locally, no-ops on CI's bun),
// making the test flaky. The remaining tests only ever set a truthy key.
// Size-routing is decided purely from `buffer.length`, so the size tests use a
// fake-length object instead of allocating tens of MB (which is slow and, on
// CI's bun, did not reliably yield the expected `.length`).
const fakeBufferOfLength = (length: number) => ({ length }) as unknown as Buffer;

describe('transcribePdf', () => {
  it('throws for a PDF larger than the max (no upload attempted)', async () => {
    // Capture the outcome via then(onFulfilled, onRejected) so the assertion
    // does not depend on the `.rejects` matcher.
    const outcome = await transcribePdf(fakeBufferOfLength(MAX_PDF_BYTES + 1), 'huge.pdf').then(
      () => 'resolved',
      (error: Error) => error.message
    );
    expect(outcome).toContain('too large');
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

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
