import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isAiInputVisible } from './aiInputVisibility';

/**
 * Renders its children only on pages where the AI input should be visible
 * (see AI_INPUT_VISIBLE_ROUTES). On any other route it renders nothing.
 */
export default function AiInputGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return isAiInputVisible(pathname) ? <>{children}</> : null;
}
