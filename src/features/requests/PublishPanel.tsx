import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { cx } from '../../shared/ui/cx';
import { feedbackFromError } from '../../shared/ui/formFeedback';
import { PhotoDropzone } from '../../shared/ui/PhotoDropzone';
import { listApplianceTypes } from '../applianceTypes/api';
import { createServiceRequest } from './api';
import { ApplianceIcon } from './ApplianceIcon';
import { applianceLabel } from './applianceLabel';
import { validateNewRequest, type NewRequestForm } from './validation';

/** State handed to the full form, kept for links that still open it. */
export interface PublishDraft {
  applianceTypeId?: string;
  photo?: File;
}

/** Frequent symptoms per appliance, in the words a client would use. */
const SYMPTOMS: Record<string, readonly string[]> = {
  Refrigeradora: ['No enfría', 'Gotea agua', 'Hace ruido', 'Se congela todo'],
  Lavadora: ['No centrifuga', 'No bota el agua', 'Hace ruido', 'No enciende'],
  'Aire acondicionado': [
    'No enfría',
    'Gotea agua',
    'Hace ruido',
    'No enciende',
  ],
  Horno: ['No calienta', 'No enciende', 'Calienta disparejo'],
  Microondas: ['No calienta', 'Hace chispas', 'El plato no gira'],
};
const GENERIC = ['No enciende', 'Hace ruido', 'Gotea agua'];

const MESSAGES: Partial<Record<keyof NewRequestForm, string>> = {
  applianceTypeId: 'Elige qué equipo se malogró.',
  originalDescription:
    'Cuéntanos qué pasa con un poco más de detalle (10 caracteres o más).',
};

/**
 * The first fold of the client's home, and a complete way to publish: pick
 * the appliance, tap frequent symptoms or write freely, optionally add a
 * photo, and publish. The request is created here; brand and model can go
 * inside the text.
 */
export function PublishPanel({
  titleId,
  greeting,
}: {
  titleId: string;
  greeting?: string;
}) {
  const id = useId();
  const navigate = useNavigate();
  const toast = useToast();
  const types = useApiQuery(['appliance-types'], (signal) =>
    listApplianceTypes({ signal }),
  );
  const [typeId, setTypeId] = useState('');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof NewRequestForm, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);

  const chosen = types.data?.find((type) => String(type.id) === typeId);
  const symptoms = chosen
    ? (SYMPTOMS[applianceLabel(chosen.name)] ?? GENERIC)
    : GENERIC;

  function toggleSymptom(symptom: string) {
    setText((current) => {
      if (current.includes(symptom)) {
        return current.replace(`${symptom}.`, '').replace(symptom, '').trim();
      }
      return current.trim() ? `${current.trim()} ${symptom}.` : `${symptom}.`;
    });
  }

  const { run: publish, isSubmitting } = useSubmitGuard(async () => {
    setServerError(null);
    try {
      const created = await createServiceRequest({
        applianceTypeId: Number(typeId),
        originalDescription: text.trim(),
      });
      toast.success(
        'Solicitud publicada. Los técnicos cercanos ya pueden verla.',
      );
      void navigate(`/client/requests/${created.id}`);
    } catch (error) {
      setServerError(
        feedbackFromError(error).message ?? 'No se pudo publicar.',
      );
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateNewRequest({
      applianceTypeId: typeId,
      originalDescription: text,
      brand: '',
      model: '',
    });
    const translated: Partial<Record<keyof NewRequestForm, string>> = {};
    for (const key of Object.keys(found) as (keyof NewRequestForm)[]) {
      const message = MESSAGES[key];
      if (message) translated[key] = message;
    }
    setErrors(translated);
    if (Object.keys(found).length === 0) void publish();
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid grid-cols-[62fr_38fr] rounded-[20px] border border-[var(--rm-cover-line)] [background-image:var(--rm-cover-bg)]"
    >
      <div className="grid content-start gap-5 p-7">
        <div className="grid gap-1">
          {greeting ? (
            <p className="m-0 text-sm font-semibold text-slate">{greeting}</p>
          ) : null}
          <h1
            id={titleId}
            tabIndex={-1}
            className="m-0 text-[clamp(2.2rem,4vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.035em] focus:outline-none"
          >
            ¿Qué se malogró?
          </h1>
        </div>

        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="sr-only">Equipo</legend>
          <div className="flex flex-wrap gap-2">
            {(types.data ?? []).map((type) => {
              const value = String(type.id);
              const checked = typeId === value;
              return (
                <label
                  key={type.id}
                  className={cx(
                    'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border bg-surface px-4 text-sm font-medium transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                    checked
                      ? 'border-cobalt text-cobalt shadow-[0_0_0_3px_var(--rm-cobalt-soft)]'
                      : 'border-line text-ink hover:border-cobalt/50',
                  )}
                >
                  <input
                    type="radio"
                    name="appliance"
                    value={value}
                    checked={checked}
                    onChange={() => setTypeId(value)}
                    className="visually-hidden"
                  />
                  <ApplianceIcon
                    name={type.name}
                    size={16}
                    aria-hidden="true"
                  />
                  {applianceLabel(type.name)}
                </label>
              );
            })}
          </div>
          {errors.applianceTypeId ? (
            <p className="m-0 text-sm text-danger">{errors.applianceTypeId}</p>
          ) : null}
        </fieldset>

        <div className="grid gap-2">
          <div
            role="group"
            aria-label="Síntomas frecuentes"
            className="flex flex-wrap gap-1.5"
          >
            {symptoms.map((symptom) => {
              const on = text.includes(symptom);
              return (
                <button
                  key={symptom}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSymptom(symptom)}
                  className={cx(
                    'min-h-8 rounded-full border px-3 text-sm transition-colors duration-200',
                    on
                      ? 'border-fresh bg-fresh-soft text-fresh'
                      : 'border-transparent bg-surface/70 text-slate hover:bg-surface',
                  )}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
          <label htmlFor={`${id}-text`} className="sr-only">
            Describe la falla
          </label>
          <textarea
            id={`${id}-text`}
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Describe qué pasa y, si lo sabes, marca y modelo (ej. Gotea agua por dentro de la habitación, Midea MSAG-12)"
            aria-invalid={errors.originalDescription ? true : undefined}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-ink aria-invalid:border-danger"
          />
          {errors.originalDescription ? (
            <p className="m-0 text-sm text-danger">
              {errors.originalDescription}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid content-start gap-4 border-l border-[var(--rm-cover-line)] p-7">
        <PhotoDropzone file={photo} onChange={setPhoto} />
        <p className="m-0 inline-flex items-center gap-2 text-sm text-slate">
          <ShieldCheck size={16} aria-hidden="true" className="text-fresh" />
          Solo la ven técnicos que atienden este equipo en tu zona.
        </p>
        {serverError ? (
          <p role="alert" className="m-0 text-sm text-danger">
            {serverError}
          </p>
        ) : null}
        <button
          type="submit"
          aria-disabled={isSubmitting || undefined}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-0 bg-brand px-6 font-semibold text-on-brand transition-colors hover:bg-brand-strong"
        >
          {isSubmitting ? 'Publicando…' : 'Publicar problema'}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
