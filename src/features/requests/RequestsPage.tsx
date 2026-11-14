import { useEffect, useState } from 'react';
import { getMyRequests, getAppliances, type ServiceRequest, type Appliance } from './api';import { LoadingState } from '../../shared/ui/LoadingState';
import { ErrorState } from '../../shared/ui/ErrorState';

export function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, appData] = await Promise.all([
        getMyRequests(),
        getAppliances(),
      ]);
      setRequests(reqData);
      setAppliances(appData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Mis Solicitudes y Catálogo
      </h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Catálogo de Electrodomésticos
        </h2>
        {appliances.length === 0 ? (
          <p>No hay electrodomésticos disponibles en el catálogo.</p>
        ) : (
          <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem' }}>
            {appliances.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong> - {item.brand} ({item.category})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Historial de Solicitudes
        </h2>
        {requests.length === 0 ? (
          <p>Aún no has registrado ninguna solicitud de reparación.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  border: '1px solid #ccc',
                  padding: '1rem',
                  borderRadius: '6px',
                }}
              >
                <p><strong>Solicitud #{req.id}</strong> - Estado: <em>{req.status}</em></p>
                <p>{req.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}