export const COURSE_COLOR_PALETTE = [
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

export function normalizeCourseColor(value: string | null | undefined): string {
  if (!value || !HEX_COLOR_PATTERN.test(value.trim())) {
    return COURSE_COLOR_PALETTE[0];
  }

  return `#${value.trim().replace(/^#/, '').toUpperCase()}`;
}

export function withOpacity(color: string, opacity: number): string {
  const normalized = normalizeCourseColor(color).replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
