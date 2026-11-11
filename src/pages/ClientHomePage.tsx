import { useAuth } from '../features/auth/authContext';
import { PageHeader } from '../shared/ui/PageHeader';

/** Landing page of the client area. The dashboard replaces it. */
export function ClientHomePage() {
  const { user } = useAuth();
  return (
    <section aria-labelledby="client-home-title">
      <PageHeader
        titleId="client-home-title"
        title="Client home"
        description={`Signed in as ${user?.name ?? 'client'}.`}
      />
    </section>
  );
}
