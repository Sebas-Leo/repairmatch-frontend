import { useAuth } from '../features/auth/authContext';
import { PageHeader } from '../shared/ui/PageHeader';

/** Landing page of the technician area. The dashboard replaces it. */
export function TechnicianHomePage() {
  const { user } = useAuth();
  return (
    <section aria-labelledby="technician-home-title">
      <PageHeader
        titleId="technician-home-title"
        title="Technician home"
        description={`Signed in as ${user?.name ?? 'technician'}.`}
      />
    </section>
  );
}
