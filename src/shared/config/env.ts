export function parseApiBaseUrl(value: string | undefined): string {
  const candidate = value ?? 'http://localhost:8080/api';
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment',
    );
  }
  return url.toString().replace(/\/+$/, '');
}

export const apiBaseUrl = parseApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
