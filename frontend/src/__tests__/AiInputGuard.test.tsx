import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiInputGuard from '../components/shared/AiInputGuard';
import { isAiInputVisible } from '../components/shared/aiInputVisibility';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AiInputGuard>
        <div data-testid="ai-input">AI Input</div>
      </AiInputGuard>
    </MemoryRouter>
  );
}

describe('isAiInputVisible', () => {
  it('is visible on the home route', () => {
    expect(isAiInputVisible('/')).toBe(true);
  });

  it('is visible on the courses list route', () => {
    expect(isAiInputVisible('/courses')).toBe(true);
  });

  it('is visible on a course detail route', () => {
    expect(isAiInputVisible('/courses/123')).toBe(true);
    expect(isAiInputVisible('/courses/abc-def')).toBe(true);
  });

  it('is hidden on a quiz detail route', () => {
    expect(isAiInputVisible('/courses/123/quizzes/456')).toBe(false);
  });

  it('is hidden on settings routes', () => {
    expect(isAiInputVisible('/settings')).toBe(false);
    expect(isAiInputVisible('/settings/password')).toBe(false);
  });

  it('is hidden on auth routes', () => {
    expect(isAiInputVisible('/login')).toBe(false);
    expect(isAiInputVisible('/register')).toBe(false);
  });
});

describe('AiInputGuard', () => {
  it('renders children on /', () => {
    renderAt('/');
    expect(screen.getByTestId('ai-input')).toBeInTheDocument();
  });

  it('renders children on /courses', () => {
    renderAt('/courses');
    expect(screen.getByTestId('ai-input')).toBeInTheDocument();
  });

  it('renders children on /courses/:id', () => {
    renderAt('/courses/42');
    expect(screen.getByTestId('ai-input')).toBeInTheDocument();
  });

  it('does not render children on a disallowed route', () => {
    renderAt('/settings');
    expect(screen.queryByTestId('ai-input')).not.toBeInTheDocument();
  });

  it('does not render children on a quiz detail route', () => {
    renderAt('/courses/1/quizzes/2');
    expect(screen.queryByTestId('ai-input')).not.toBeInTheDocument();
  });
});
