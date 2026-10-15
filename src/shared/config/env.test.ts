import { describe, expect, it } from 'vitest';
import { parseApiBaseUrl } from './env';

describe('public API configuration', () => {
  it('uses the local backend default and normalizes trailing slashes', () => {
    expect(parseApiBaseUrl(undefined)).toBe('http://localhost:8080/api');
    expect(parseApiBaseUrl('https://example.com/api///')).toBe(
      'https://example.com/api',
    );
  });

  it.each([
    '',
    '/api',
    'not a url',
    'ftp://example.com',
    'https://u:p@example.com',
    'https://example.com?x=1',
    'https://example.com/#x',
  ])('rejects unsafe or invalid base: %s', (base) => {
    expect(() => parseApiBaseUrl(base)).toThrow('VITE_API_BASE_URL');
  });
});
