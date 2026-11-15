import { Link } from 'react-router';

/** Shown when a signed-in user opens an area that belongs to the other role. */
export function UnauthorizedPage() {
  return (
    <section className="not-found" aria-labelledby="unauthorized-title">
      <p className="eyebrow">403 / Sin permiso</p>
      <h1 id="unauthorized-title">No tienes acceso a esta página.</h1>
      <p>Esta sección corresponde a otro tipo de cuenta.</p>
      <Link className="button-link" to="/home">
        Ir a tu inicio
      </Link>
    </section>
  );
}
