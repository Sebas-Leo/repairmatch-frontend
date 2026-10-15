import { useAuth } from '../features/auth/authContext';
import { LogoutButton } from '../features/auth/LogoutButton';

/** Placeholder landing page of the technician area. Feature screens come later. */
export function TechnicianHomePage() {
  const { user } = useAuth();
  return (
    <section aria-labelledby="technician-home-title">
      <h1 id="technician-home-title">Technician home</h1>
      <p>Signed in as {user?.name ?? 'technician'}.</p>
      <p>Opportunities and proposals will appear here soon.</p>
      <LogoutButton />
    </section>
  );
}
