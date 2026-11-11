/**
 * Encodes one URL path segment (an id) so a value can never add segments or
 * climb out of its route (`/`, `?`, `#` are escaped; `.` and `..` are refused).
 */
export function pathSegment(value: string | number): string {
  const text = String(value);
  if (text === '' || text === '.' || text === '..') {
    throw new Error('Invalid API path segment');
  }
  return encodeURIComponent(text);
}

export type QueryValue = string | number | boolean | null | undefined;

/**
 * Appends a query string, encoding every value and skipping empty ones:
 * `withQuery('/requests', { page: 0, search: '' })` -> `/requests?page=0`.
 */
export function withQuery(
  path: string,
  query: Readonly<Record<string, QueryValue>>,
): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(name, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}
