import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { collectModuleRoutes, type RouteModule } from './moduleRoutes';

const route = (path: string): RouteObject => ({ path });

describe('collectModuleRoutes', () => {
  it('returns nothing when no module registers routes', () => {
    expect(collectModuleRoutes({})).toEqual([]);
  });

  it('merges the routes of every module in a stable, key-sorted order', () => {
    const modules: Record<string, RouteModule> = {
      '../features/services/client.routes.tsx': {
        default: [route('services')],
      },
      '../features/requests/client.routes.tsx': {
        default: [route('requests'), route('requests/new')],
      },
    };

    expect(collectModuleRoutes(modules).map((r) => r.path)).toEqual([
      'requests',
      'requests/new',
      'services',
    ]);
  });

  it('ignores a module file without a default export', () => {
    const modules = {
      '../features/broken/client.routes.tsx': {} as RouteModule,
      '../features/ok/client.routes.tsx': { default: [route('ok')] },
    };

    expect(collectModuleRoutes(modules).map((r) => r.path)).toEqual(['ok']);
  });
});
