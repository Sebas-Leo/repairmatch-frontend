import { Send } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { feedbackFromError } from '../../shared/ui/formFeedback';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Button } from '../../shared/ui/Button';
import { submitProposal } from '../proposals/api';
import {
  CONDITIONS_MAX,
  parseCost,
  toLocalDateTime,
  validateProposal,
  type ProposalForm,
} from '../proposals/validation';

/** The shared validation speaks English; the technician's view speaks Spanish. */
const MESSAGES: Record<keyof ProposalForm, string> = {
  diagnosticCost: 'Ingresa un monto válido, por ejemplo 45 o 45.50.',
  availableAt: 'Elige una fecha y hora futura para la visita.',
  conditions: 'Escribe un mensaje corto con tu diagnóstico o lo que incluye.',
};

const FIELD =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink aria-invalid:border-danger';

/**
 * Quote without leaving the feed: amount in soles, when the visit can happen
 * and a short diagnostic message. Sending it removes the card, since the
 * feed only lists requests the technician has not answered.
 */
export function InlineOfferForm({
  requestId,
  onCancel,
  onSent,
}: {
  requestId: number;
  onCancel: () => void;
  onSent: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [form, setForm] = useState<ProposalForm>({
    diagnosticCost: '',
    availableAt: '',
    conditions: '',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProposalForm, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);

  const { run: send, isSubmitting } = useSubmitGuard(async () => {
    setServerError(null);
    try {
      await submitProposal(requestId, {
        diagnosticCost: parseCost(form.diagnosticCost),
        availableAt: toLocalDateTime(form.availableAt),
        conditions: form.conditions.trim(),
      });
      toast.success('Oferta enviada. El cliente la verá junto a las demás.');
      onSent();
    } catch (error) {
      setServerError(
        feedbackFromError(error).message ?? 'No se pudo enviar la oferta.',
      );
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateProposal(form);
    const translated = Object.fromEntries(
      Object.keys(found).map((key) => [
        key,
        MESSAGES[key as keyof ProposalForm],
      ]),
    );
    setErrors(translated);
    if (Object.keys(found).length === 0) void send();
  }

  function set<K extends keyof ProposalForm>(name: K, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      lang="es-PE"
      className="rise grid gap-3 rounded-2xl border border-line bg-surface-2 p-4"
      aria-label="Enviar oferta"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor={`${id}-cost`} className="text-sm font-semibold">
            Monto estimado (S/)
          </label>
          <input
            id={`${id}-cost`}
            inputMode="decimal"
            placeholder="45.00"
            value={form.diagnosticCost}
            onChange={(event) => set('diagnosticCost', event.target.value)}
            aria-invalid={errors.diagnosticCost ? true : undefined}
            aria-describedby={
              errors.diagnosticCost ? `${id}-cost-error` : undefined
            }
            className={FIELD}
          />
          {errors.diagnosticCost ? (
            <p id={`${id}-cost-error`} className="m-0 text-xs text-danger">
              {errors.diagnosticCost}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1">
          <label htmlFor={`${id}-when`} className="text-sm font-semibold">
            Visita disponible
          </label>
          <input
            id={`${id}-when`}
            type="datetime-local"
            value={form.availableAt}
            onChange={(event) => set('availableAt', event.target.value)}
            aria-invalid={errors.availableAt ? true : undefined}
            aria-describedby={
              errors.availableAt ? `${id}-when-error` : undefined
            }
            className={FIELD}
          />
          {errors.availableAt ? (
            <p id={`${id}-when-error`} className="m-0 text-xs text-danger">
              {errors.availableAt}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-msg`} className="text-sm font-semibold">
          Mensaje de diagnóstico
        </label>
        <textarea
          id={`${id}-msg`}
          rows={3}
          maxLength={CONDITIONS_MAX}
          placeholder="Ej.: Reviso el compresor y el termostato; los repuestos se cotizan aparte."
          value={form.conditions}
          onChange={(event) => set('conditions', event.target.value)}
          aria-invalid={errors.conditions ? true : undefined}
          aria-describedby={errors.conditions ? `${id}-msg-error` : undefined}
          className={`${FIELD} py-2`}
        />
        {errors.conditions ? (
          <p id={`${id}-msg-error`} className="m-0 text-xs text-danger">
            {errors.conditions}
          </p>
        ) : null}
      </div>
      {serverError ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          aria-disabled={isSubmitting || undefined}
          icon={<Send size={16} aria-hidden="true" />}
        >
          {isSubmitting ? 'Enviando…' : 'Enviar oferta'}
        </Button>
      </div>
    </form>
  );
}
