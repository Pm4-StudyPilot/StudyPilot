import { translateApiMessage, translateApiMessageInPayload } from '../utils/apiMessages';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(translateApiMessage(error.message || `Request failed: ${response.status}`));
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const payload = await response.json();
  return translateApiMessageInPayload(payload) as T;
}

/**
 * Result of fetching a binary endpoint.
 *
 * Properties:
 * - blob: the raw response body
 * - filename: parsed from the Content-Disposition header (if any), suitable
 *   for use as a download filename. Undefined if the header is missing or
 *   could not be parsed.
 */
export interface BlobResponse {
  blob: Blob;
  filename?: string;
}

/**
 * Extracts the filename from a Content-Disposition header.
 *
 * Supports both legacy `filename="..."` and RFC 5987 `filename*=UTF-8''...`
 * parts. The RFC 5987 part is preferred when present because it preserves
 * non-ASCII characters; the legacy part is used as a fallback.
 */
function parseFilenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;

  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // fall through to the quoted form
    }
  }

  const quotedMatch = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  return undefined;
}

/**
 * Fetches a binary resource (e.g. an uploaded document) and returns the
 * body as a Blob plus the parsed filename. Uses the same authentication
 * pattern as the JSON helpers.
 */
async function requestBlob(endpoint: string): Promise<BlobResponse> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(translateApiMessage(error.message || `Request failed: ${response.status}`));
  }

  const blob = await response.blob();
  const filename = parseFilenameFromContentDisposition(response.headers.get('Content-Disposition'));

  return { blob, filename };
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  getBlob: (endpoint: string) => requestBlob(endpoint),

  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : null,
    }),
};
