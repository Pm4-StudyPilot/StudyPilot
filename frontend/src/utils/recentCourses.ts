/**
 * Tracking and retrieval of recently visited course ids in localStorage.
 *
 * The list is stored as a JSON array of strings, most-recent-first. Visiting
 * the same course twice moves it to the front (dedupe) so we never end up
 * with duplicates. The list is capped at MAX_TRACKED to keep the value
 * bounded — only the first few are ever displayed anyway.
 */

const STORAGE_KEY = 'studypilot.recentCourses';

/**
 * How many ids we remember in localStorage. The dashboard renders fewer
 * than this (currently 3), but we keep a longer history so deleted-course
 * filtering still has data to fall back on.
 */
const MAX_TRACKED = 10;

function readStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    // Either localStorage is unavailable (e.g. private mode) or the stored
    // value is corrupt. Treat as empty rather than crashing the page.
    return [];
  }
}

function writeStoredIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage write failed (quota, disabled). Silently skip — the next
    // visit will retry.
  }
}

/**
 * Records a course visit. The id is moved to (or inserted at) the front of
 * the list so the most-recently-visited course is always at index 0.
 */
export function trackVisitedCourse(courseId: string): void {
  if (!courseId) return;

  const existing = readStoredIds().filter((id) => id !== courseId);
  const next = [courseId, ...existing].slice(0, MAX_TRACKED);
  writeStoredIds(next);
}

/**
 * Returns the stored recent course ids, most recent first.
 */
export function getRecentCourseIds(): string[] {
  return readStoredIds();
}

/**
 * Forgets a course (e.g. after deletion) so it stops appearing in the
 * recent list. Safe to call for ids that aren't tracked.
 */
export function forgetVisitedCourse(courseId: string): void {
  if (!courseId) return;

  const next = readStoredIds().filter((id) => id !== courseId);
  writeStoredIds(next);
}
