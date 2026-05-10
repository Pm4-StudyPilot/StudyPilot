/**
 * Returns a query parameter only if it is a single string value.
 *
 * Express query params may also be arrays or nested ParsedQs objects.
 * This helper normalizes them to a simple string | undefined shape.
 *
 * @param value Raw query parameter value
 * @returns Single string value or undefined
 */
export function getSingleQueryParam(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
