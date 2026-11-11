import { describe, expect, it } from 'vitest';
import { httpUrl } from '../safeUrl';
import { pathSegment, withQuery } from './paths';

describe('pathSegment', () => {
  it('keeps ids as a single encoded segment', () => {
    expect(pathSegment(42)).toBe('42');
    expect(pathSegment('3f2c9d6e-0000-4000-8000-000000000000')).toBe(
      '3f2c9d6e-0000-4000-8000-000000000000',
    );
    expect(pathSegment('a/b?c#d')).toBe('a%2Fb%3Fc%23d');
  });

  it.each(['', '.', '..'])('refuses %j', (value) => {
    expect(() => pathSegment(value)).toThrow('Invalid API path segment');
  });
});

describe('withQuery', () => {
  it('encodes values and skips empty ones', () => {
    expect(withQuery('/requests', {})).toBe('/requests');
    expect(
      withQuery('/requests', {
        page: 0,
        size: 25,
        search: 'lg & co',
        status: '',
        sort: undefined,
        extra: null,
        flag: false,
      }),
    ).toBe('/requests?page=0&size=25&search=lg+%26+co&flag=false');
  });

  it('extends a path that already has a query and drops non-finite numbers', () => {
    expect(withQuery('/a?x=1', { page: 2, size: Number.NaN })).toBe(
      '/a?x=1&page=2',
    );
  });
});

describe('httpUrl', () => {
  it('keeps absolute http(s) addresses and refuses the rest', () => {
    expect(httpUrl('https://img.example.com/a.jpg')).toBe(
      'https://img.example.com/a.jpg',
    );
    expect(httpUrl('http://example.com')).toBe('http://example.com/');
    expect(httpUrl('javascript:alert(1)')).toBeUndefined();
    expect(httpUrl('data:image/png;base64,AAAA')).toBeUndefined();
    expect(httpUrl('/relative.jpg')).toBeUndefined();
    expect(httpUrl('')).toBeUndefined();
    expect(httpUrl(null)).toBeUndefined();
  });
});
