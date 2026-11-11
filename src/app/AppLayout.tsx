import { Suspense, useContext } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { AuthContext } from '../features/auth/authContext';
import { LogoutButton } from '../features/auth/LogoutButton';
import { ThemeProvider } from '../shared/theme/ThemeProvider';
import { ThemeToggle } from '../shared/theme/ThemeToggle';
import { ToastProvider } from '../shared/toast/ToastProvider';
import { cx } from '../shared/ui/cx';
import { LoadingState } from '../shared/ui/LoadingState';
import { NAVIGATION } from './navigation';

/** Navigation and account controls; nothing while signed out. */
function SessionNav() {
  // Read the context directly: the layout also renders outside AuthProvider (tests).
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated') return null;
  const items = NAVIGATION[auth.user.role];
  return (
    <>
      <nav
        aria-label="Main"
        className="order-last w-full overflow-x-auto sm:order-none sm:w-auto"
      >
        <ul className="m-0 flex list-none gap-1 p-0">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  cx(
                    'inline-flex min-h-10 items-center rounded-[10px] px-3 font-medium whitespace-nowrap no-underline',
                    isActive
                      ? 'bg-brand-soft text-brand'
                      : 'text-muted hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <span className="hidden text-sm text-muted md:inline">
        {auth.user.name}
      </span>
      <LogoutButton />
    </>
  );
}

/**
 * Shell shared by every route: skip link, header, main landmark and footer.
 * It also hosts the theme and the toasts (`useToast()`): the layout outlives
 * navigation, so a toast raised just before a redirect is still shown on the
 * next page. The `Suspense` boundary around the outlet is a safety net:
 * anything that suspends without a boundary of its own shows the loading
 * state inside `<main>` instead of blanking the whole shell.
 */
export function AppLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
            <div className="shell flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <Link
                className="brand mr-auto"
                to="/"
                aria-label="RepairMatch home"
              >
                <span className="brand-mark" aria-hidden="true">
                  R
                </span>
                RepairMatch
              </Link>
              <SessionNav />
              <ThemeToggle />
            </div>
          </header>
          <main
            id="main-content"
            className="shell flex-1 py-6 sm:py-8"
            tabIndex={-1}
          >
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </main>
          <footer className="border-t border-line">
            <p className="shell m-0 py-5 text-sm text-muted">
              RepairMatch · Repairs matched to nearby technicians
            </p>
          </footer>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
