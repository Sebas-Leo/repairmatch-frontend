import type { RouteObject } from 'react-router';

/** Shape of a module route file: `export default [...] satisfies RouteObject[]`. */
export type RouteModule = { default: RouteObject[] };

/**
 * Flattens the route files discovered by `import.meta.glob`. Keys are sorted so
 * the route order never depends on the file system, and a file without a
 * default export contributes nothing.
 */
export function collectModuleRoutes(
  modules: Record<string, RouteModule>,
): RouteObject[] {
  return Object.keys(modules)
    .sort()
    .flatMap((key) => modules[key]?.default ?? []);
}
