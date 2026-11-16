import { useAuth } from '../auth/authContext';
import { Card } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';
import { IdentityVerificationCard } from './IdentityVerificationCard';

/** /client/account: the client's account data and optional identity check. */
export function AccountPage() {
  const { user } = useAuth();
  return (
    <section aria-labelledby="account-title" className="grid gap-6">
      <PageHeader
        titleId="account-title"
        title="Mi cuenta"
        description="Tus datos y la verificación de identidad, que ayuda a que los técnicos confíen en tus solicitudes."
        breadcrumbs={[
          { label: 'Inicio', to: '/client' },
          { label: 'Mi cuenta' },
        ]}
      />
      <div className="grid max-w-2xl gap-6">
        <Card as="section" aria-labelledby="account-data-heading">
          <h2 id="account-data-heading" className="m-0 mb-3 text-xl font-bold">
            Tus datos
          </h2>
          <dl className="m-0 grid gap-2 text-sm">
            <div>
              <dt className="text-muted">Nombre</dt>
              <dd className="m-0 font-semibold">{user?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Correo</dt>
              <dd className="m-0 font-semibold">{user?.email ?? '—'}</dd>
            </div>
          </dl>
        </Card>
        <IdentityVerificationCard />
      </div>
    </section>
  );
}
