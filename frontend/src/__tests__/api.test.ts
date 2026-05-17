import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../services/api';

/**
 * Builds a minimal Response-like mock for fetch.
 *
 * Properties supported:
 * - ok / status
 * - blob() returning the provided blob
 * - json() returning the provided JSON body (for error paths)
 * - headers.get(name)
 */
function createFetchResponse(opts: {
  ok: boolean;
  status?: number;
  blob?: Blob;
  jsonBody?: unknown;
  headers?: Record<string, string>;
}): Response {
  const headerMap = new Map<string, string>(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );

  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 500),
    blob: vi.fn(async () => opts.blob ?? new Blob()),
    json: vi.fn(async () => opts.jsonBody ?? {}),
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
  } as unknown as Response;
}

/**
 * Test suite for the api.getBlob helper and its supporting functions.
 *
 * Covers:
 * - Authorization header is attached when a token is in localStorage
 * - No Authorization header when no token is present
 * - Successful response returns blob + filename parsed from header
 * - RFC 5987 filename is preferred over the legacy filename
 * - Legacy quoted filename is returned when RFC 5987 is absent
 * - Missing or malformed Content-Disposition yields undefined filename
 * - Malformed RFC 5987 percent-encoding falls through to legacy
 * - Non-ok response throws using the server-provided message
 * - Non-ok response without parseable JSON throws a generic message
 */
describe('api.getBlob', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('attaches the Authorization header when a token is stored', async () => {
    localStorage.setItem('token', 'abc123');
    const fetchMock = vi.fn(async () => createFetchResponse({ ok: true, blob: new Blob(['x']) }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.getBlob('/documents/doc-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/documents/doc-1', {
      headers: { Authorization: 'Bearer abc123' },
    });
  });

  it('omits the Authorization header when no token is stored', async () => {
    const fetchMock = vi.fn(async () => createFetchResponse({ ok: true, blob: new Blob(['x']) }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.getBlob('/documents/doc-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/documents/doc-1', {
      headers: {},
    });
  });

  it('returns the response body as a Blob', async () => {
    const expectedBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({ ok: true, blob: expectedBlob })
    ) as unknown as typeof fetch;

    const result = await api.getBlob('/documents/doc-1');

    expect(result.blob).toBe(expectedBlob);
  });

  it('parses an RFC 5987 filename from the Content-Disposition header', async () => {
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({
        ok: true,
        blob: new Blob(['x']),
        headers: {
          'Content-Disposition':
            'attachment; filename="Bcher.pdf"; filename*=UTF-8\'\'B%C3%BCcher%20Zusammenfassung.pdf',
        },
      })
    ) as unknown as typeof fetch;

    const result = await api.getBlob('/documents/doc-1');

    expect(result.filename).toBe('Bücher Zusammenfassung.pdf');
  });

  it('falls back to the legacy filename when no RFC 5987 part is present', async () => {
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({
        ok: true,
        blob: new Blob(['x']),
        headers: {
          'Content-Disposition': 'attachment; filename="Slides.pdf"',
        },
      })
    ) as unknown as typeof fetch;

    const result = await api.getBlob('/documents/doc-1');

    expect(result.filename).toBe('Slides.pdf');
  });

  it('returns undefined filename when the header is missing', async () => {
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({ ok: true, blob: new Blob(['x']) })
    ) as unknown as typeof fetch;

    const result = await api.getBlob('/documents/doc-1');

    expect(result.filename).toBeUndefined();
  });

  it('returns undefined filename when the header cannot be parsed', async () => {
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({
        ok: true,
        blob: new Blob(['x']),
        headers: { 'Content-Disposition': 'attachment' },
      })
    ) as unknown as typeof fetch;

    const result = await api.getBlob('/documents/doc-1');

    expect(result.filename).toBeUndefined();
  });

  it('falls through to legacy filename when RFC 5987 part is malformed', async () => {
    // %ZZ is an invalid percent-encoding sequence — decodeURIComponent throws
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({
        ok: true,
        blob: new Blob(['x']),
        headers: {
          'Content-Disposition': 'attachment; filename="fallback.pdf"; filename*=UTF-8\'\'bad%ZZ',
        },
      })
    ) as unknown as typeof fetch;

    const result = await api.getBlob('/documents/doc-1');

    expect(result.filename).toBe('fallback.pdf');
  });

  it('throws using the server-provided message on a non-ok response', async () => {
    globalThis.fetch = vi.fn(async () =>
      createFetchResponse({
        ok: false,
        status: 403,
        jsonBody: { message: 'You do not have access to this document.' },
      })
    ) as unknown as typeof fetch;

    await expect(api.getBlob('/documents/doc-1')).rejects.toThrow(
      'You do not have access to this document.'
    );
  });

  it('throws a generic message when the error response body is not JSON', async () => {
    const errorResponse = createFetchResponse({ ok: false, status: 500 });
    // Force json() to reject so the helper falls through to its default message
    (errorResponse.json as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Not JSON')
    );
    globalThis.fetch = vi.fn(async () => errorResponse) as unknown as typeof fetch;

    await expect(api.getBlob('/documents/doc-1')).rejects.toThrow('Request failed: 500');
  });
});
