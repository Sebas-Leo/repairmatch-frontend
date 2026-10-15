import { useAuth } from '../features/auth/authContext';
import { LogoutButton } from '../features/auth/LogoutButton';

/** Placeholder landing page of the client area. Feature screens come later. */
export function ClientHomePage() {
  const { user } = useAuth();
  return (
    <section aria-labelledby="client-home-title">
      <h1 id="client-home-title">Client home</h1>
      <p>Signed in as {user?.name ?? 'client'}.</p>
      <p>Repair requests will appear here soon.</p>
      <LogoutButton />
    </section>
  );
}
