import { Link, Route, Routes } from 'react-router';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App() {
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer shell">
        RepairMatch · Frontend foundation
      </footer>
    </>
  );
}
