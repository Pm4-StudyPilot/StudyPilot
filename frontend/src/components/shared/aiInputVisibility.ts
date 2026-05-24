import { matchPath } from 'react-router-dom';

// Routes on which the AI input should be visible.
export const AI_INPUT_VISIBLE_ROUTES = ['/', '/courses', '/courses/:id'];

/** Returns whether the AI input should be visible for the given pathname. */
export function isAiInputVisible(pathname: string): boolean {
  return AI_INPUT_VISIBLE_ROUTES.some((pattern) => matchPath(pattern, pathname) !== null);
}
