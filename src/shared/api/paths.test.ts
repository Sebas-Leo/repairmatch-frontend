import { describe, expect, it } from 'vitest';
import { pathSegment } from './paths';

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
