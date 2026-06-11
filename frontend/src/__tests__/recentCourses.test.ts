import { describe, it, expect, beforeEach } from 'vitest';
import {
  forgetVisitedCourse,
  getRecentCourseIds,
  trackVisitedCourse,
} from '../utils/recentCourses';

/**
 * Tests for the localStorage-backed recent-courses tracker used by the
 * dashboard's "Recent courses" section.
 */
describe('recentCourses utility', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty list when nothing has been tracked', () => {
    expect(getRecentCourseIds()).toEqual([]);
  });

  it('adds a visited course to the front of the list', () => {
    trackVisitedCourse('course-a');

    expect(getRecentCourseIds()).toEqual(['course-a']);
  });

  it('moves an existing course to the front instead of duplicating it', () => {
    trackVisitedCourse('a');
    trackVisitedCourse('b');
    trackVisitedCourse('a');

    expect(getRecentCourseIds()).toEqual(['a', 'b']);
  });

  it('preserves visit order with the most recent visit first', () => {
    trackVisitedCourse('a');
    trackVisitedCourse('b');
    trackVisitedCourse('c');

    expect(getRecentCourseIds()).toEqual(['c', 'b', 'a']);
  });

  it('caps the stored list to 10 entries', () => {
    for (let i = 0; i < 15; i += 1) {
      trackVisitedCourse(`course-${i}`);
    }

    const stored = getRecentCourseIds();
    expect(stored).toHaveLength(10);
    expect(stored[0]).toBe('course-14');
  });

  it('ignores empty ids', () => {
    trackVisitedCourse('');

    expect(getRecentCourseIds()).toEqual([]);
  });

  it('returns an empty list when the stored value is corrupted JSON', () => {
    window.localStorage.setItem('studypilot.recentCourses', '{not json');

    expect(getRecentCourseIds()).toEqual([]);
  });

  it('returns an empty list when the stored value is not an array', () => {
    window.localStorage.setItem('studypilot.recentCourses', '"a string"');

    expect(getRecentCourseIds()).toEqual([]);
  });

  it('filters out non-string entries when reading', () => {
    window.localStorage.setItem('studypilot.recentCourses', JSON.stringify(['a', 1, null, 'b']));

    expect(getRecentCourseIds()).toEqual(['a', 'b']);
  });

  it('removes a course id when forgotten', () => {
    trackVisitedCourse('a');
    trackVisitedCourse('b');

    forgetVisitedCourse('a');

    expect(getRecentCourseIds()).toEqual(['b']);
  });

  it('is a no-op when forgetting an id that is not tracked', () => {
    trackVisitedCourse('a');

    forgetVisitedCourse('not-tracked');

    expect(getRecentCourseIds()).toEqual(['a']);
  });
});
