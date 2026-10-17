import { useEffect, useRef } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

interface ErrorCopy {
  eyebrow: string;
  title: string;
  message: string;
  /** Whether loading the page again can help. */
  retryable: boolean;
}

/** Friendly copy only: nothing from the error itself (message, stack, response body) is shown. */
function copyFor(error: unknown): ErrorCopy {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        eyebrow: '404 / Page not found',
        title: 'This page is not here.',
        message:
          'The address may be incorrect, or this page may not exist yet.',
        retryable: false,
      };
    }
    return {
      eyebrow: `${error.status} / Error`,
      title: 'Something went wrong',
      message: 'This page could not be loaded. Try again in a few moments.',
      retryable: true,
    };
  }
  return {
    eyebrow: 'Unexpected error',
    title: 'Something went wrong',
    message:
      'An unexpected problem stopped this page from loading. Reload the page or go back to the home page.',
    retryable: true,
  };
}

interface RouteErrorPageProps {
  /** Reloads the page. Defaults to `window.location.reload()`. */
  onReload?: () => void;
}

const reloadWindow = () => window.location.reload();

/**
 * Router `errorElement`: what a visitor sees when a page throws while
 * rendering, fails to download or answers a route error. It takes focus and is
 * announced (`role="alert"`), like the form error summary.
 */
export function RouteErrorPage({
  onReload = reloadWindow,
}: RouteErrorPageProps) {
  const error = useRouteError();
  const alertRef = useRef<HTMLElement>(null);
  const { eyebrow, title, message, retryable } = copyFor(error);

  useEffect(() => {
    alertRef.current?.focus();
  }, []);

  return (
    <section
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="route-error-title"
      className="error-page"
    >
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="route-error-title">{title}</h1>
      <p>{message}</p>
      <div className="error-actions">
        {retryable ? (
          <button type="button" onClick={onReload}>
            Reload page
          </button>
        ) : null}
        <Link className="button-link" to="/">
          Go to home
        </Link>
      </div>
    </section>
  );
}

/**
 * Error element of the layout route: the layout itself failed, so there is no
 * header or main landmark left and this page brings its own.
 */
export function RootErrorPage(props: RouteErrorPageProps) {
  return (
    <main className="shell">
      <RouteErrorPage {...props} />
    </main>
  );
}
