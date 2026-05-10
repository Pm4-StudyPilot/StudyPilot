/**
 * Returns a visual sort indicator for a given field.
 *
 * Behavior:
 * - returns empty string if the field is not the active sort field
 * - returns arrow based on sort direction if active
 *
 * @param field Field to render indicator for
 * @param activeField Currently active sort field
 * @param direction Current sort direction
 */
export function getSortIcon<T extends string>(
  field: T,
  activeField: T,
  direction: 'asc' | 'desc'
): string | null {
  if (field !== activeField) return null;
  return direction === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down';
}
