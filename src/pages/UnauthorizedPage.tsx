import { Link } from 'react-router';

/** Shown when a signed-in user opens an area that belongs to the other role. */
export function UnauthorizedPage() {
  return (
    <section className="not-found" aria-labelledby="unauthorized-title">
      <p className="eyebrow">403 / Not allowed</p>
      <h1 id="unauthorized-title">You do not have access to this page.</h1>
      <p>This area belongs to a different type of account.</p>
      <Link className="button-link" to="/">
        Go to your home
      </Link>
    </section>
  );
}
