import { afterEach, expect, it, vi } from 'vitest';
import { reloadPage } from './reloadPage';

afterEach(() => vi.unstubAllGlobals());

it('reloads the current document', () => {
  const reload = vi.fn();
  vi.stubGlobal('location', { reload });

  reloadPage();

  expect(reload).toHaveBeenCalledTimes(1);
});
