import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Page not found</p>
      <h1>This page is not here.</h1>
      <p>The address may be incorrect, or this page may not exist yet.</p>
      <Link className="button-link" to="/">
        Back to home
      </Link>
    </section>
  );
}
