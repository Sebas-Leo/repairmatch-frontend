import { Suspense, useContext } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { AuthContext } from '../features/auth/authContext';
import { LogoutButton } from '../features/auth/LogoutButton';
import { WorkButton } from '../features/technicians/WorkButton';
import { ThemeProvider } from '../shared/theme/ThemeProvider';
import { ThemeToggle } from '../shared/theme/ThemeToggle';
import { ToastProvider } from '../shared/toast/ToastProvider';
import { cx } from '../shared/ui/cx';
import { LoadingState } from '../shared/ui/LoadingState';
import { NAVIGATION } from './navigation';

/** Main navigation of the signed-in role; nothing while signed out. On a phone it takes its own row. */
function SessionNav() {
  // Read the context directly: the layout also renders outside AuthProvider (tests).
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated') return null;
  const items = NAVIGATION[auth.user.role];
  return (
    <>
      <nav
        aria-label="Main"
        className="order-last w-full overflow-x-auto [scrollbar-width:none] sm:order-none sm:w-auto"
      >
        <ul className="m-0 flex list-none gap-1 p-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  cx(
                    'inline-flex min-h-10 items-center rounded-full px-4 font-semibold whitespace-nowrap no-underline transition-colors duration-200',
                    isActive
                      ? 'bg-ink text-bg'
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
    </>
  );
}

/** Name, sign out and theme stay together, so a narrow header never splits them. */
function AccountControls() {
  const auth = useContext(AuthContext);
  const signedIn = auth?.status === 'authenticated';
  return (
    <div className="flex items-center gap-2">
      {signedIn ? (
        <>
          {auth.user.role === 'TECHNICIAN' ? (
            <WorkButton userId={auth.user.id} name={auth.user.name} />
          ) : null}
          <span className="hidden text-sm text-muted md:inline">
            {auth.user.name}
          </span>
          <LogoutButton />
        </>
      ) : null}
      <ThemeToggle />
    </div>
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
          Saltar al contenido
        </a>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--rm-nav-line)] bg-surface">
            <div className="shell flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
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
              <AccountControls />
            </div>
          </header>
          <main
            id="main-content"
            className="shell flex-1 py-8 sm:py-12"
            tabIndex={-1}
          >
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </main>
          <footer className="mt-12 border-t border-line/60">
            <p className="shell my-0 py-5 text-sm text-muted">
              RepairMatch · Reparaciones conectadas con técnicos cercanos
            </p>
          </footer>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
