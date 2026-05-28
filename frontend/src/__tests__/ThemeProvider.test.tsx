import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ThemeProvider } from '../context/ThemeProvider';
import { useTheme } from '../context/useTheme';

type MediaListener = (event: { matches: boolean }) => void;

function createMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: '(prefers-color-scheme: light)',
    onchange: null,
    addEventListener: vi.fn((_: string, listener: MediaListener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_: string, listener: MediaListener) => {
      listeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  function trigger(matches: boolean) {
    mql.matches = matches;
    listeners.forEach((listener) => listener({ matches }));
  }
  return { mql, trigger };
}

function ThemeProbe() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
      <button type="button" onClick={() => setTheme('light')}>
        set light
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        set dark
      </button>
    </div>
  );
}

/**
 * ThemeProvider + useTheme tests.
 *
 * Covered scenarios:
 * - default theme based on stored preference
 * - default theme based on system preference when no stored value
 * - toggleTheme cycles dark <-> light and persists to localStorage
 * - setTheme writes to localStorage
 * - document data-theme / data-bs-theme attributes follow state
 * - system theme changes only apply when there is no stored preference
 * - useTheme outside of provider throws
 */
describe('ThemeProvider', () => {
  let matchMediaMock: ReturnType<typeof createMatchMedia>;
  const originalMatchMedia = (window as unknown as { matchMedia?: unknown }).matchMedia;

  function installMatchMedia(initialMatches: boolean) {
    matchMediaMock = createMatchMedia(initialMatches);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => matchMediaMock.mql as unknown as MediaQueryList,
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    installMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-bs-theme');
  });

  it('uses the stored theme when one is present in localStorage', () => {
    window.localStorage.setItem('theme', 'light');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });

  it('falls back to the system theme when no stored value exists', () => {
    installMatchMedia(true); // prefers light

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
  });

  it('defaults to dark when system prefers dark and nothing is stored', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggleTheme flips between dark and light and persists the choice', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('setTheme writes the new theme to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set light' }));
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(window.localStorage.getItem('theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'set dark' }));
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('follows OS preference changes when no explicit theme is stored', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');

    act(() => {
      matchMediaMock.trigger(true);
    });
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    act(() => {
      matchMediaMock.trigger(false);
    });
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
  });

  it('ignores OS preference changes once an explicit preference is stored', () => {
    window.localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');

    act(() => {
      matchMediaMock.trigger(true);
    });

    // Stored preference wins — value stays at 'dark'.
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
  });

  it('useTheme throws when used outside of the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow(/useTheme must be used within a ThemeProvider/);
    consoleError.mockRestore();
  });
});
