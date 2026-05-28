import { matchPath } from 'react-router-dom';

/**
 * Returns a human-readable description of the page the user is on, for the
 * routes where the AI input is available. Returned string is appended to the
 * first message of a chat thread so TARS can ground prompts like "update the
 * current course" without the user having to spell out the id.
 */
export function describeCurrentPage(pathname: string): string | null {
  const courseDetail = matchPath('/courses/:id', pathname);
  if (courseDetail?.params.id) {
    return `The user is on the course detail page for course id ${courseDetail.params.id}.`;
  }
  if (matchPath('/courses', pathname)) {
    return 'The user is on the courses list page.';
  }
  if (matchPath('/', pathname)) {
    return 'The user is on the StudyPilot home page.';
  }
  return null;
}
