import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

// Pages are lazy. Loading their modules once per test file, before the first
// test, keeps the first render of a page from depending on how long Vite takes
// to transform it, which is slow with coverage on a busy machine. A page whose
// module a test mocks to fail is skipped here, not an error.
beforeAll(async () => {
  await Promise.allSettled(
    Object.values(import.meta.glob('../pages/*Page.tsx')).map((load) => load()),
  );
}, 30_000);

afterEach(cleanup);
