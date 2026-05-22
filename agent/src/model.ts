import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const DEFAULT_MODEL = 'gemini-3-pro-preview';

/**
 * Builds the Gemini chat model that powers the TARS agent.
 * Reads `GOOGLE_API_KEY` (required) and `GEMINI_MODEL` (optional override).
 */
export function getModel(): ChatGoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set; the TARS agent cannot start.');
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    temperature: 0.3,
  });
}
