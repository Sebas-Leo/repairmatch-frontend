export function HomePage() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <div>
        <p className="eyebrow">A better connection for repairs</p>
        <h1 id="home-title">Good repairs start with the right match.</h1>
        <p className="intro">
          We are building RepairMatch to connect people who need repairs with
          technicians who can help.
        </p>
        <p className="notice">
          This is our starting point. Sign-in, technician search, and service
          requests are not available yet.
        </p>
      </div>
      <aside className="foundation-card" aria-labelledby="foundation-title">
        <span className="card-index" aria-hidden="true">
          01 / Foundation
        </span>
        <h2 id="foundation-title">Built one reliable step at a time.</h2>
        <p>
          The frontend foundation is ready for development. Product features and
          a live backend connection come next.
        </p>
        <div className="card-line" aria-hidden="true" />
        <p className="card-note">No demo accounts. No simulated services.</p>
      </aside>
    </section>
  );
}
