import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { PublishDraft } from './PublishPanel';
import { listApplianceTypes } from '../applianceTypes/api';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ErrorState } from '../../shared/ui/ErrorState';
import {
  FormErrorSummary,
  type SummaryField,
} from '../../shared/ui/FormErrorSummary';
import {
  feedbackFromError,
  hasFeedback,
  useFormFeedback,
} from '../../shared/ui/formFeedback';
import { PageHeader } from '../../shared/ui/PageHeader';
import { SelectField } from '../../shared/ui/SelectField';
import { TextAreaField } from '../../shared/ui/TextAreaField';
import { TextField } from '../../shared/ui/TextField';
import { publishWithPhoto } from './publishWithPhoto';
import { PhotoDropzone } from '../../shared/ui/PhotoDropzone';
import {
  BRAND_MAX,
  DESCRIPTION_MAX,
  validateNewRequest,
  type NewRequestForm,
} from './validation';

const FIELDS: readonly SummaryField[] = [
  {
    name: 'applianceTypeId',
    id: 'new-request-type',
    label: 'Electrodoméstico',
  },
  {
    name: 'originalDescription',
    id: 'new-request-description',
    label: 'Problema',
  },
  { name: 'brand', id: 'new-request-brand', label: 'Marca' },
  { name: 'model', id: 'new-request-model', label: 'Modelo' },
];

const EMPTY: NewRequestForm = {
  applianceTypeId: '',
  originalDescription: '',
  brand: '',
  model: '',
};

/** /client/requests/new: publish a repair request. */
export function NewRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const draft = (useLocation().state ?? null) as PublishDraft | null;
  const [photo, setPhoto] = useState<File | null>(draft?.photo ?? null);
  const [form, setForm] = useState<NewRequestForm>(() => ({
    ...EMPTY,
    applianceTypeId: draft?.applianceTypeId ?? '',
  }));
  const { feedback, summaryRef, show, clear } = useFormFeedback();
  const types = useApiQuery(['appliance-types'], (signal) =>
    listApplianceTypes({ signal }),
  );

  const { run: submit, isSubmitting } = useSubmitGuard(async () => {
    clear();
    try {
      const { created, pendingPhoto } = await publishWithPhoto(
        {
          applianceTypeId: Number(form.applianceTypeId),
          originalDescription: form.originalDescription.trim(),
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
        },
        photo,
      );
      toast.success(
        'Solicitud publicada. Los técnicos compatibles podrán verla.',
      );
      navigate(`/client/requests/${created.id}`, { state: { pendingPhoto } });
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof NewRequestForm>(name: K, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateNewRequest(form);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void submit();
  }

  return (
    <section aria-labelledby="new-request-title">
      <PageHeader
        titleId="new-request-title"
        title="Nueva solicitud de reparación"
        description="Describe la falla del equipo. Los detalles claros ayudan a recibir mejores ofertas."
        breadcrumbs={[
          { label: 'Inicio', to: '/client' },
          { label: 'Mis solicitudes', to: '/client/requests' },
          { label: 'Nueva solicitud' },
        ]}
      />
      <Card className="max-w-2xl">
        {feedback && hasFeedback(feedback) ? (
          <FormErrorSummary
            ref={summaryRef}
            feedback={feedback}
            fields={FIELDS}
          />
        ) : null}
        {types.status === 'error' ? (
          <ErrorState
            error={types.error}
            title="No se pudo cargar la lista de electrodomésticos"
            onRetry={types.reload}
          />
        ) : null}
        <form onSubmit={handleSubmit} noValidate>
          <fieldset disabled={isSubmitting} className="form-fields">
            <legend className="visually-hidden">Datos de la solicitud</legend>
            <SelectField
              id="new-request-type"
              name="applianceTypeId"
              label="Electrodoméstico"
              placeholder={
                types.data
                  ? 'Selecciona un electrodoméstico'
                  : 'Cargando electrodomésticos…'
              }
              options={(types.data ?? []).map((type) => ({
                value: String(type.id),
                label: type.name,
              }))}
              value={form.applianceTypeId}
              onChange={(event) => set('applianceTypeId', event.target.value)}
              error={feedback?.fieldErrors.applianceTypeId}
            />
            <TextAreaField
              id="new-request-description"
              name="originalDescription"
              label="Problema"
              hint="Describe qué sucede, desde cuándo y qué has intentado hacer."
              placeholder="La refrigeradora dejó de enfriar ayer, pero la luz todavía enciende."
              maxLength={DESCRIPTION_MAX}
              rows={5}
              value={form.originalDescription}
              onChange={(event) =>
                set('originalDescription', event.target.value)
              }
              error={feedback?.fieldErrors.originalDescription}
            />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <TextField
                id="new-request-brand"
                name="brand"
                label="Marca (opcional)"
                placeholder="Samsung"
                maxLength={BRAND_MAX}
                value={form.brand}
                onChange={(event) => set('brand', event.target.value)}
                error={feedback?.fieldErrors.brand}
              />
              <TextField
                id="new-request-model"
                name="model"
                label="Modelo (opcional)"
                placeholder="RT38K5930SL"
                maxLength={BRAND_MAX}
                value={form.model}
                onChange={(event) => set('model', event.target.value)}
                error={feedback?.fieldErrors.model}
              />
            </div>
            <PhotoDropzone
              file={photo}
              onChange={setPhoto}
              label="Foto del electrodoméstico (opcional)"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? 'Publicando…' : 'Publicar solicitud'}
              </Button>
              <ButtonLink to="/client/requests" variant="ghost">
                Cancelar
              </ButtonLink>
            </div>
          </fieldset>
        </form>
      </Card>
    </section>
  );
}
