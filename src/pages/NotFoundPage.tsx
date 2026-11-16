import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Página no encontrada</p>
      <h1>Esta página no existe.</h1>
      <p>La dirección puede ser incorrecta o esta página todavía no existe.</p>
      <Link className="button-link" to="/home">
        Volver al inicio
      </Link>
    </section>
  );
}
