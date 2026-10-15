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
