import { useEffect, useRef } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { isChunkLoadError } from '../shared/errors/chunkLoadError';
import { reloadPage } from '../shared/errors/reloadPage';

interface ErrorCopy {
  eyebrow: string;
  title: string;
  message: string;
  /** Whether loading the page again can help. */
  reload: boolean;
  /** Whether going home is offered. */
  home: boolean;
}

/** Friendly copy only: nothing from the error itself (message, stack, response body) is shown. */
function copyFor(error: unknown): ErrorCopy {
  if (isChunkLoadError(error)) {
    // Going home would render the same lazy page again and fail the same way.
    return {
      eyebrow: 'No se pudo cargar la página',
      title: 'Puede haber una nueva versión disponible',
      message:
        'No se pudo cargar la página. Es posible que la aplicación se haya actualizado. Recarga para obtener la última versión.',
      reload: true,
      home: false,
    };
  }
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        eyebrow: '404 / Página no encontrada',
        title: 'Esta página no existe.',
        message:
          'La dirección puede ser incorrecta o esta página todavía no existe.',
        reload: false,
        home: true,
      };
    }
    return {
      eyebrow: `${error.status} / Error`,
      title: 'Ocurrió un error',
      message: 'No se pudo cargar la página. Inténtalo en unos momentos.',
      reload: true,
      home: true,
    };
  }
  return {
    eyebrow: 'Error inesperado',
    title: 'Ocurrió un error',
    message:
      'Un problema impidió cargar esta página. Recarga la página o vuelve al inicio.',
    reload: true,
    home: true,
  };
}

interface RouteErrorPageProps {
  /** Reloads the page. Defaults to `window.location.reload()`. */
  onReload?: () => void;
}

/**
 * Router `errorElement`: what a visitor sees when a page throws while
 * rendering, fails to download or answers a route error. It takes focus and is
 * announced (`role="alert"`), like the form error summary.
 */
export function RouteErrorPage({ onReload = reloadPage }: RouteErrorPageProps) {
  const error = useRouteError();
  const alertRef = useRef<HTMLElement>(null);
  const { eyebrow, title, message, reload, home } = copyFor(error);

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
        {reload ? (
          <button type="button" onClick={onReload}>
            Recargar página
          </button>
        ) : null}
        {home ? (
          <Link className="button-link" to="/">
            Ir al inicio
          </Link>
        ) : null}
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
