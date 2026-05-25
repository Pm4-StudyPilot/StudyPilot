function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatDate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function formatMonth(
  value: Date | string | number,
  lang: string,
  format: 'short' | 'long' = 'long'
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(lang, { month: format }).format(date);
}

export function formatMonthLabel(value: Date | string | number, lang: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(date);
}
