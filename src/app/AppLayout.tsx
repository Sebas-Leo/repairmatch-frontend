import { Link, Outlet } from 'react-router';

/** Shell shared by every route: skip link, header, main landmark and footer. */
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
        <Outlet />
      </main>
      <footer className="site-footer shell">
        RepairMatch · Frontend foundation
      </footer>
    </>
  );
}
