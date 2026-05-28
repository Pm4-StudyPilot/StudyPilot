import { describe, it, expect } from 'vitest';
import { describeCurrentPage } from '../components/ai/pageContext';

describe('describeCurrentPage', () => {
  it('describes the home page', () => {
    expect(describeCurrentPage('/')).toBe('The user is on the StudyPilot home page.');
  });

  it('describes the courses list page', () => {
    expect(describeCurrentPage('/courses')).toBe('The user is on the courses list page.');
  });

  it('includes the course id on the course detail page', () => {
    expect(describeCurrentPage('/courses/abc-123')).toBe(
      'The user is on the course detail page for course id abc-123.'
    );
  });

  it('returns null for routes without page context', () => {
    expect(describeCurrentPage('/settings')).toBeNull();
    expect(describeCurrentPage('/courses/1/quizzes/2')).toBeNull();
    expect(describeCurrentPage('/login')).toBeNull();
  });
});
