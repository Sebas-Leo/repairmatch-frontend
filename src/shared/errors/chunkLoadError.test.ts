import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/http';
import { isChunkLoadError } from './chunkLoadError';

describe('isChunkLoadError', () => {
  it.each([
    [
      'Chrome and Edge',
      new TypeError(
        'Failed to fetch dynamically imported module: https://app.test/assets/Page-3f9a.js',
      ),
    ],
    ['Safari', new TypeError('Importing a module script failed.')],
    [
      'Firefox',
      new TypeError(
        'error loading dynamically imported module: https://app.test/assets/Page-3f9a.js',
      ),
    ],
    [
      'webpack-style',
      Object.assign(new Error('x'), { name: 'ChunkLoadError' }),
    ],
    [
      'an error-like object',
      { message: 'FAILED TO FETCH DYNAMICALLY IMPORTED MODULE' },
    ],
  ])('recognises %s', (_source, error) => {
    expect(isChunkLoadError(error)).toBe(true);
  });

  it.each([
    ['an ordinary error', new Error('Cannot read properties of undefined')],
    ['a failed fetch of data', new TypeError('Failed to fetch')],
    ['an API error', new ApiError(500, 'Request failed (500)', undefined)],
    ['an error without a message', {}],
    ['a message that is not text', { message: 42 }],
    ['a plain string', 'Failed to fetch dynamically imported module'],
    ['null', null],
    ['undefined', undefined],
  ])('does not take %s for a failed download', (_source, error) => {
    expect(isChunkLoadError(error)).toBe(false);
  });
});
