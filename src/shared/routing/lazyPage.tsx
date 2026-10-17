import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { LoadingState } from '../ui/LoadingState';

/** Names of the exports of a module that are components without required props. */
type PageExport<Module> = {
  [Name in keyof Module]: Module[Name] extends ComponentType ? Name : never;
}[keyof Module] &
  string;

/**
 * Route element that downloads its page on first use. Pages keep their named
 * export, so nothing changes in the page file:
 *
 *     { path: 'requests', element: lazyPage(() => import('./RequestsPage'), 'RequestsPage') }
 *
 * The element carries its own `Suspense` boundary, so only the page area shows
 * the fallback and the layout around it stays on screen. Call it while building
 * the route table (module level), never during a render: every call creates a
 * new lazy component, which would remount the page each time.
 */
export function lazyPage<
  Module extends Record<string, unknown>,
  Name extends PageExport<Module>,
>(
  load: () => Promise<Module>,
  name: Name,
  fallback: ReactNode = <LoadingState />,
) {
  const Page = lazy(async () => ({
    default: (await load())[name] as ComponentType,
  }));
  return (
    <Suspense fallback={fallback}>
      <Page />
    </Suspense>
  );
}
