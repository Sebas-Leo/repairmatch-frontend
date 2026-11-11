/**
 * The URL when it is an absolute http(s) address, else `undefined`. Use it for
 * any URL that comes from data (evidence photos) before putting it in `href`
 * or `src`: a `javascript:` URL would run code when clicked.
 */
export function httpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
