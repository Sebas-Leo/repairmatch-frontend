import { Suspense } from 'react';
import { Link, Outlet } from 'react-router';
import { LoadingState } from '../shared/ui/LoadingState';

/**
 * Shell shared by every route: skip link, header, main landmark and footer.
 * The `Suspense` boundary around the outlet is a safety net: anything that
 * suspends without a boundary of its own shows the loading state inside
 * `<main>` instead of blanking the whole shell.
 */
export function AppLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header shell">
        <Link className="brand" to="/" aria-label="RepairMatch home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          RepairMatch
        </Link>
        <span className="status">
          <span aria-hidden="true" /> In development
        </span>
      </header>
      <main id="main-content" className="shell" tabIndex={-1}>
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer shell">
        RepairMatch · Frontend foundation
      </footer>
    </>
  );
}
