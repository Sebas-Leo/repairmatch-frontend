import { MapPin } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { MatchingRequest } from '../../shared/api/types';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
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
import { TextAreaField } from '../../shared/ui/TextAreaField';
import { TextField } from '../../shared/ui/TextField';
import { submitProposal } from './api';
import {
  CONDITIONS_MAX,
  parseCost,
  toLocalDateTime,
  validateProposal,
  type ProposalForm,
} from './validation';

const FIELDS: readonly SummaryField[] = [
  { name: 'diagnosticCost', id: 'offer-cost', label: 'Costo del diagnóstico' },
  { name: 'availableAt', id: 'offer-when', label: 'Disponible desde' },
  { name: 'conditions', id: 'offer-conditions', label: 'Qué incluye' },
];

const EMPTY: ProposalForm = {
  diagnosticCost: '',
  availableAt: '',
  conditions: '',
};

/** Router state can be stale or edited: check every field that is rendered. */
function isOpportunity(value: unknown): value is MatchingRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'number' &&
    typeof v.applianceTypeName === 'string' &&
    typeof v.description === 'string' &&
    typeof v.distanceKm === 'number' &&
    Number.isFinite(v.distanceKm)
  );
}

/**
 * /technician/opportunities/:requestId/offer. The technician cannot read the
 * request before offering (403), so the card passes its summary as router
 * state; a direct visit still works with just the id.
 */
export function SubmitProposalPage() {
  const { requestId } = useParams();
  const id = Number(requestId);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const state: unknown = location.state;
  const opportunity =
    isOpportunity(state) && state.requestId === id ? state : undefined;
  const [form, setForm] = useState(EMPTY);
  const { feedback, summaryRef, show, clear } = useFormFeedback();

  const { run: submit, isSubmitting } = useSubmitGuard(async () => {
    clear();
    try {
      await submitProposal(id, {
        diagnosticCost: parseCost(form.diagnosticCost),
        availableAt: toLocalDateTime(form.availableAt),
        conditions: form.conditions.trim(),
      });
      toast.success(
        'Oferta enviada. El cliente podrá compararla con las demás.',
      );
      navigate('/technician/proposals');
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof ProposalForm>(name: K, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateProposal(form);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void submit();
  }

  const valid = Number.isInteger(id) && id > 0;
  const crumbs = [
    { label: 'Inicio', to: '/technician' },
    { label: 'Oportunidades', to: '/technician/opportunities' },
    { label: 'Enviar oferta' },
  ];

  if (!valid) {
    return (
      <section aria-labelledby="offer-title">
        <PageHeader
          titleId="offer-title"
          title="Solicitud no encontrada"
          breadcrumbs={crumbs}
        />
        <ButtonLink to="/technician/opportunities" variant="secondary">
          Volver a oportunidades
        </ButtonLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="offer-title">
      <PageHeader
        titleId="offer-title"
        title={`Enviar una oferta para la solicitud #${id}`}
        description="El cliente compara las ofertas por costo y disponibilidad."
        breadcrumbs={crumbs}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          {feedback && hasFeedback(feedback) ? (
            <FormErrorSummary
              ref={summaryRef}
              feedback={feedback}
              fields={FIELDS}
            />
          ) : null}
          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={isSubmitting} className="form-fields">
              <legend className="visually-hidden">Detalle de la oferta</legend>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <TextField
                  id="offer-cost"
                  name="diagnosticCost"
                  label="Costo del diagnóstico (S/)"
                  inputMode="decimal"
                  placeholder="45.00"
                  value={form.diagnosticCost}
                  onChange={(event) =>
                    set('diagnosticCost', event.target.value)
                  }
                  error={feedback?.fieldErrors.diagnosticCost}
                />
                <TextField
                  id="offer-when"
                  name="availableAt"
                  type="datetime-local"
                  label="Disponible desde"
                  value={form.availableAt}
                  onChange={(event) => set('availableAt', event.target.value)}
                  error={feedback?.fieldErrors.availableAt}
                />
              </div>
              <TextAreaField
                id="offer-conditions"
                name="conditions"
                label="Qué incluye"
                hint="Diagnóstico, traslado, garantía y conceptos que se cotizan por separado."
                maxLength={CONDITIONS_MAX}
                value={form.conditions}
                onChange={(event) => set('conditions', event.target.value)}
                error={feedback?.fieldErrors.conditions}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" loading={isSubmitting}>
                  {isSubmitting ? 'Enviando…' : 'Enviar oferta'}
                </Button>
                <ButtonLink to="/technician/opportunities" variant="ghost">
                  Cancelar
                </ButtonLink>
              </div>
            </fieldset>
          </form>
        </Card>
        {opportunity ? (
          <Card className="grid content-start gap-2">
            <h2 className="m-0 text-lg">{opportunity.applianceTypeName}</h2>
            <p className="m-0 whitespace-pre-line">{opportunity.description}</p>
            <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={16} aria-hidden="true" />
              {opportunity.distanceKm.toFixed(1)} km away
            </p>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
