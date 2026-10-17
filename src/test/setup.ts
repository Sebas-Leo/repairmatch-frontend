import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pages are lazy, so the first query for a page also waits for its module to
// be transformed and loaded. With coverage on a busy machine that can take
// longer than the default 1 s.
configure({ asyncUtilTimeout: 4_000 });

afterEach(cleanup);
