import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { logger } from './logger';

const DEFAULT_MODEL = 'gemini-3-flash-preview';

/** Hard ceiling, matched to the document upload limit. PDFs above this are rejected. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/**
 * PDFs up to this size are sent inline (fast, one request). Larger PDFs go
 * through the Gemini File API. The inline request has a ~20 MB ceiling and
 * base64 inflates bytes by ~33%, so we keep the inline path comfortably below
 * that and let the File API handle everything bigger (up to {@link MAX_PDF_BYTES}).
 */
export const INLINE_PDF_BYTES = 7 * 1024 * 1024;

const FILE_PROCESSING_POLL_MS = 2_000;

/**
 * How long to wait for the Gemini File API to finish processing an uploaded
 * PDF before giving up. Large, image-heavy scans (~1 MB/page) can take several
 * minutes. This shares the `MCP_TOOL_TIMEOUT_MS` budget — the agent's MCP tool
 * call wraps this whole read, so they use the same ceiling.
 */
const FILE_PROCESSING_TIMEOUT_MS = Number(process.env.MCP_TOOL_TIMEOUT_MS) || 300_000;

const TRANSCRIPTION_PROMPT = `Transcribe this PDF document into clean Markdown.
- Preserve the reading order, headings, lists, and tables (use Markdown tables).
- For diagrams, charts or images, add a brief inline description as "[Figure: ...]".
- Do not summarise, comment, or add anything that is not in the document.
Output only the transcription.`;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function requireApiKey(): string {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set; cannot read PDFs with Gemini vision.');
  }
  return apiKey;
}

function getModel(apiKey: string) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    generationConfig: { temperature: 0 },
  });
}

/**
 * Uploads a PDF via the Gemini File API and waits until it is processed, so it
 * can be referenced by uri. Used for PDFs too large to inline. The uploaded
 * file is deleted best-effort afterwards (the API also auto-expires it ~48h).
 */
async function transcribeViaFileApi(
  apiKey: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const fileManager = new GoogleAIFileManager(apiKey);
  const uploaded = await fileManager.uploadFile(buffer, {
    mimeType: 'application/pdf',
    displayName: filename,
  });

  let file = uploaded.file;
  let waited = 0;
  while (file.state === FileState.PROCESSING) {
    if (waited >= FILE_PROCESSING_TIMEOUT_MS) {
      throw new Error(
        `Timed out processing "${filename}" for vision reading after ${Math.round(waited / 1000)}s.`
      );
    }
    await sleep(FILE_PROCESSING_POLL_MS);
    waited += FILE_PROCESSING_POLL_MS;
    file = await fileManager.getFile(file.name);
  }

  if (file.state === FileState.FAILED) {
    throw new Error(`Gemini failed to process "${filename}".`);
  }

  logger.info(
    { filename, bytes: buffer.length, processingMs: waited },
    'PDF processed by Gemini File API; transcribing'
  );

  try {
    const result = await getModel(apiKey).generateContent([
      { text: TRANSCRIPTION_PROMPT },
      { fileData: { mimeType: 'application/pdf', fileUri: file.uri } },
    ]);
    return result.response.text();
  } finally {
    fileManager.deleteFile(file.name).catch((err) => {
      logger.warn({ err, file: file.name }, 'Failed to delete Gemini File API upload');
    });
  }
}

async function transcribeInline(apiKey: string, buffer: Buffer): Promise<string> {
  const result = await getModel(apiKey).generateContent([
    { text: TRANSCRIPTION_PROMPT },
    { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
  ]);
  return result.response.text();
}

/**
 * Transcribes a PDF to text using Gemini's vision capability. Unlike text
 * extraction, this reads scanned/image-based pages, diagrams and tables.
 * Small PDFs are sent inline; larger ones (up to {@link MAX_PDF_BYTES}) go
 * through the Gemini File API.
 *
 * @throws if `GOOGLE_API_KEY` is unset or the PDF exceeds {@link MAX_PDF_BYTES}.
 */
export async function transcribePdf(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = requireApiKey();

  if (buffer.length > MAX_PDF_BYTES) {
    const mb = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new Error(
      `"${filename}" is too large for vision reading (${mb} MB; limit ${MAX_PDF_BYTES / (1024 * 1024)} MB).`
    );
  }

  return buffer.length <= INLINE_PDF_BYTES
    ? transcribeInline(apiKey, buffer)
    : transcribeViaFileApi(apiKey, buffer, filename);
}
