const COURSE_COLOR_PALETTE = [
  '#6C63FF',
  '#4DA3FF',
  '#00C2A8',
  '#FF8A5B',
  '#F0AD4E',
  '#7BD88F',
  '#FF6B7A',
  '#C77DFF',
] as const;

const HEX_COLOR_PATTERN = /^#?[0-9a-f]{6}$/i;

function createColorHash(seed: string): number {
  return Array.from(seed).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 0);
}

export function isValidCourseColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim());
}

export function normalizeCourseColor(value: string | null | undefined): string | null {
  if (!isValidCourseColor(value)) {
    return null;
  }

  return `#${value.trim().replace(/^#/, '').toUpperCase()}`;
}

export function getFallbackCourseColor(seed: string): string {
  return COURSE_COLOR_PALETTE[createColorHash(seed) % COURSE_COLOR_PALETTE.length];
}

export function resolveCourseColor(value: string | null | undefined, seed: string): string {
  return normalizeCourseColor(value) ?? getFallbackCourseColor(seed);
}
