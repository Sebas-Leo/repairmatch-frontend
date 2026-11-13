import { useState, type FormEvent } from 'react';
import { listApplianceTypes } from '../applianceTypes/api';
import type { ApplianceType, TechnicianProfile } from '../../shared/api/types';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { cx } from '../../shared/ui/cx';
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
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { TextAreaField } from '../../shared/ui/TextAreaField';
import { TextField } from '../../shared/ui/TextField';
import {
  getOwnTechnicianProfile,
  updateOwnTechnicianProfile,
  updateServiceArea,
} from './api';
import {
  BIO_MAX,
  PHONE_MAX,
  parseDecimal,
  validateProfile,
  validateServiceArea,
  type ProfileForm,
  type ServiceAreaForm,
} from './validation';

const PROFILE_FIELDS: readonly SummaryField[] = [
  {
    name: 'experienceYears',
    id: 'profile-experience',
    label: 'Years of experience',
  },
  { name: 'phone', id: 'profile-phone', label: 'Phone' },
  { name: 'bio', id: 'profile-bio', label: 'Bio' },
  {
    name: 'applianceTypeIds',
    id: 'profile-appliances',
    label: 'Appliances you repair',
  },
];

const AREA_FIELDS: readonly SummaryField[] = [
  { name: 'latitude', id: 'area-latitude', label: 'Latitude' },
  { name: 'longitude', id: 'area-longitude', label: 'Longitude' },
  { name: 'maxRadiusKm', id: 'area-radius', label: 'Radius (km)' },
];

/**
 * Espacio listo para tu GIF o imagen animada:
 * Si guardas un archivo como `public/technician-showcase.gif` (o cambias esta ruta
 * por un enlace https://...gif), se mostrará en el recuadro visual del radar.
 */
const SHOWCASE_GIF_BG = "url('/technician-showcase.gif')";

interface LimaZonePreset {
  name: string;
  districts: string;
  latitude: number;
  longitude: number;
  defaultRadiusKm: number;
}

const LIMA_ZONES: readonly LimaZonePreset[] = [
  {
    name: 'Lima Centro',
    districts: 'Cercado, Jesús María, Lince, Breña, La Victoria',
    latitude: -12.0464,
    longitude: -77.0428,
    defaultRadiusKm: 12,
  },
  {
    name: 'Lima Sur',
    districts: 'Villa El Salvador, SJM, VMT, Chorrillos, Lurín',
    latitude: -12.2125,
    longitude: -76.9372,
    defaultRadiusKm: 15,
  },
  {
    name: 'Lima Oeste',
    districts: 'Barranco, Miraflores, Surco, San Borja, Magdalena',
    latitude: -12.1219,
    longitude: -77.0297,
    defaultRadiusKm: 10,
  },
  {
    name: 'Lima Norte',
    districts: 'Los Olivos, Comas, Independencia, SMP, Puente Piedra',
    latitude: -11.9917,
    longitude: -77.0706,
    defaultRadiusKm: 15,
  },
  {
    name: 'Lima Este',
    districts: 'Ate, Santa Anita, La Molina, SJL, Chaclacayo',
    latitude: -12.0553,
    longitude: -76.9456,
    defaultRadiusKm: 16,
  },
  {
    name: 'Callao',
    districts: 'Bellavista, La Perla, Carmen de la Legua, Ventanilla',
    latitude: -12.0566,
    longitude: -77.1181,
    defaultRadiusKm: 14,
  },
];

// Estilo compartido para armonizar los inputs y etiquetas con las tarjetas resaltadas
const HARMONIZED_FIELDS =
  'form-fields [&_label]:font-display [&_label]:text-[15px] [&_label]:font-bold [&_label]:tracking-tight [&_p.field-hint]:text-[13px] [&_p.field-hint]:font-medium [&_input:not([type=checkbox])]:rounded-[14px_4px_14px_4px] [&_input:not([type=checkbox])]:border-2 [&_input:not([type=checkbox])]:border-[#3c903b]/45 [&_input:not([type=checkbox])]:bg-[#f7fbee] dark:[&_input:not([type=checkbox])]:bg-[#162720] [&_input:not([type=checkbox])]:px-3.5 [&_input:not([type=checkbox])]:py-2.5 [&_input:not([type=checkbox])]:text-base [&_input:not([type=checkbox])]:font-semibold [&_input:not([type=checkbox])]:shadow-[2px_2px_0_0_rgba(0,104,56,0.16)] [&_input:not([type=checkbox])]:transition-all [&_input:not([type=checkbox])]:duration-200 focus-within:[&_input:not([type=checkbox])]:border-[#006838] [&_textarea]:rounded-[16px_4px_16px_4px] [&_textarea]:border-2 [&_textarea]:border-[#3c903b]/45 [&_textarea]:bg-[#f7fbee] dark:[&_textarea]:bg-[#162720] [&_textarea]:p-3.5 [&_textarea]:text-base [&_textarea]:font-medium [&_textarea]:shadow-[2px_2px_0_0_rgba(0,104,56,0.16)] [&_textarea]:transition-all [&_textarea]:duration-200';

/** Calcula la distancia geodésica en km entre dos coordenadas (Haversine). */
function distanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'RM';
}

function matchedTypeIds(
  profile: TechnicianProfile,
  types: readonly ApplianceType[],
): number[] {
  const active = new Set(profile.applianceTypes);
  return types.filter((t) => active.has(t.name)).map((t) => t.id);
}

/** Etiqueta en paralelogramo con degradado lima-esmeralda suave. */
function NeonCutTag({
  step,
  label,
  variant = 'lime',
}: {
  step: string;
  label: string;
  variant?: 'lime' | 'emerald';
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cx(
          'inline-flex -skew-x-12 items-center gap-2 rounded-[10px_3px_10px_3px] border-2 border-[#006838] px-3.5 py-1 font-display text-xs font-bold tracking-wider uppercase shadow-[3px_3px_0_0_#006838] transition-transform duration-200 hover:-translate-y-0.5',
          variant === 'lime'
            ? 'bg-gradient-to-r from-[#d0dc15] via-[#b9d51f] to-[#8cc733] text-[#0b1f17]'
            : 'bg-gradient-to-r from-[#76c13c] via-[#8cc733] to-[#b9d51f] text-[#0b1f17]',
        )}
      >
        <span className="skew-x-12 rounded bg-[#006838] px-1.5 py-0.5 text-[10px] font-bold text-[#d0dc15]">
          {step}
        </span>
        <span className="skew-x-12">{label}</span>
      </span>
    </div>
  );
}

function ProfileDetailsCard({
  profile,
  types,
  onSaved,
}: {
  profile: TechnicianProfile;
  types: readonly ApplianceType[];
  onSaved: (updated: TechnicianProfile) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ProfileForm>(() => ({
    experienceYears:
      profile.experienceYears !== undefined
        ? String(profile.experienceYears)
        : '',
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
    applianceTypeIds: matchedTypeIds(profile, types),
  }));
  const { feedback, summaryRef, show, clear } = useFormFeedback();

  const { run: save, isSubmitting } = useSubmitGuard(async () => {
    clear();
    const exp = form.experienceYears.trim();
    try {
      const updated = await updateOwnTechnicianProfile({
        experienceYears: exp ? Number(exp) : null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        applianceTypeIds: form.applianceTypeIds,
      });
      onSaved(updated);
      toast.success('Profile saved.');
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof ProfileForm>(name: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleType(id: number) {
    setForm((current) => {
      const has = current.applianceTypeIds.includes(id);
      const next = has
        ? current.applianceTypeIds.filter((item) => item !== id)
        : [...current.applianceTypeIds, id];
      return { ...current, applianceTypeIds: next };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateProfile(form);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void save();
  }

  return (
    <Card
      as="section"
      aria-labelledby="profile-heading"
      className="relative overflow-hidden rounded-[28px_10px_28px_10px] border-2 border-[#147539] bg-gradient-to-br from-[#f6faec] via-[#eff6e0] to-[#e7f1d3] p-5 shadow-[5px_5px_0_0_#3c903b] transition-all duration-300 sm:p-6 dark:from-[#13221c] dark:via-[#162820] dark:to-[#192d24]"
    >
      <div className="grid gap-3 border-b-2 border-dashed border-[#3c903b]/35 pb-4 mb-5">
        <NeonCutTag step="01" label="Oficio y Especialidades" variant="lime" />
        <div className="grid gap-2 pt-1">
          <h2
            id="profile-heading"
            className="m-0 flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="inline-block h-6 w-2.5 -skew-x-12 rounded-sm bg-[#d0dc15] ring-2 ring-[#006838]"
            />
            Professional details
          </h2>
          <p className="m-0 text-[15px] font-medium text-muted">
            Your technical presentation sheet shown when sending an offer.
          </p>
          {profile.applianceTypes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.applianceTypes.map((name) => (
                <span
                  key={name}
                  className="-skew-x-6 rounded-[10px_3px_10px_3px] border border-[#147539] bg-[#d0dc15]/45 px-2.5 py-0.5 font-display text-xs font-bold text-ink shadow-[2px_2px_0_0_rgba(0,104,56,0.2)]"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={PROFILE_FIELDS}
        />
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSubmitting} className={HARMONIZED_FIELDS}>
          <legend className="visually-hidden">Professional details</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              id="profile-experience"
              name="experienceYears"
              label="Years of experience"
              inputMode="numeric"
              hint="Field years repairing home appliances"
              placeholder="5"
              value={form.experienceYears}
              onChange={(event) => set('experienceYears', event.target.value)}
              error={feedback?.fieldErrors.experienceYears}
            />
            <TextField
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              label="Phone"
              hint="Direct contact once your quote is accepted"
              placeholder="+51 999 888 777"
              maxLength={PHONE_MAX}
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
              error={feedback?.fieldErrors.phone}
            />
          </div>

          <TextAreaField
            id="profile-bio"
            name="bio"
            label="Bio"
            hint="Share the brands you master (Samsung, LG, Bosch, Mabe...), tools and warranty."
            rows={3}
            maxLength={BIO_MAX}
            value={form.bio}
            onChange={(event) => set('bio', event.target.value)}
            error={feedback?.fieldErrors.bio}
          />

          <div
            id="profile-appliances"
            role="group"
            aria-labelledby="profile-appliances-label"
            tabIndex={-1}
            className="radio-group pt-1"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                id="profile-appliances-label"
                className="font-display text-[15px] font-bold tracking-tight"
              >
                Appliances you repair
              </span>
              <span className="-skew-x-6 rounded-[8px_2px_8px_2px] border border-[#006838] bg-[#d0dc15] px-2.5 py-0.5 font-display text-xs font-bold text-[#0b1f17] shadow-[2px_2px_0_0_#006838]">
                {form.applianceTypeIds.length} of {types.length} active
              </span>
            </div>
            <p className="field-hint">
              Select at least one appliance line so matching requests can appear
              in Opportunities.
            </p>
            <div className="grid gap-2.5 pt-2.5 sm:grid-cols-2">
              {types.map((type) => {
                const checked = form.applianceTypeIds.includes(type.id);
                return (
                  <label
                    key={type.id}
                    className={cx(
                      'flex cursor-pointer items-start gap-3 rounded-[16px_5px_16px_5px] border-2 p-3.5 text-sm transition-all duration-200 ease-out',
                      checked
                        ? '-translate-y-0.5 border-[#006838] bg-gradient-to-br from-[#d0dc15]/60 via-[#b9d51f]/40 to-[#76c13c]/30 shadow-[3px_3px_0_0_#006838]'
                        : 'border-[#3c903b]/40 bg-[#eef6df]/85 hover:-translate-y-0.5 hover:border-[#28833a] hover:bg-[#e5f1cf] dark:bg-[#192d24]/80 dark:hover:bg-[#1f372c]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(type.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#147539]"
                    />
                    <span className="grid gap-0.5">
                      <span className="font-display text-[15px] font-bold text-ink">
                        {type.name}
                      </span>
                      {type.description ? (
                        <span className="text-xs font-medium text-muted">
                          {type.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {feedback?.fieldErrors.applianceTypeIds ? (
              <p className="field-error pt-1 font-semibold">
                {feedback.fieldErrors.applianceTypeIds}
              </p>
            ) : null}
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={isSubmitting}
              className="rounded-[14px_4px_14px_4px] border-2 border-[#006838] bg-gradient-to-r from-[#d0dc15] to-[#a3ce29] px-5 font-display text-base font-bold text-[#0b1f17] shadow-[3px_3px_0_0_#006838] transition-transform duration-150 hover:-translate-y-0.5 hover:from-[#e6e20c] hover:to-[#b9d51f]"
            >
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}

function ServiceAreaCard({
  profile,
  onSaved,
}: {
  profile: TechnicianProfile;
  onSaved: (updated: TechnicianProfile) => void;
}) {
  const toast = useToast();
  const [area, setArea] = useState<ServiceAreaForm>(() => ({
    latitude: profile.latitude !== undefined ? String(profile.latitude) : '',
    longitude: profile.longitude !== undefined ? String(profile.longitude) : '',
    maxRadiusKm:
      profile.maxRadiusKm !== undefined ? String(profile.maxRadiusKm) : '',
  }));
  const { feedback, summaryRef, show, clear } = useFormFeedback();

  const { run: save, isSubmitting } = useSubmitGuard(async () => {
    clear();
    try {
      const updated = await updateServiceArea({
        latitude: parseDecimal(area.latitude),
        longitude: parseDecimal(area.longitude),
        maxRadiusKm: parseDecimal(area.maxRadiusKm),
      });
      onSaved(updated);
      toast.success('Service area saved.');
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof ServiceAreaForm>(name: K, value: string) {
    setArea((current) => ({ ...current, [name]: value }));
  }

  function applyZonePreset(zone: LimaZonePreset) {
    setArea((current) => ({
      latitude: String(zone.latitude),
      longitude: String(zone.longitude),
      maxRadiusKm: current.maxRadiusKm.trim() || String(zone.defaultRadiusKm),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateServiceArea(area);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void save();
  }

  const areaReady =
    profile.latitude !== undefined &&
    profile.longitude !== undefined &&
    profile.maxRadiusKm !== undefined;

  const currentLat = parseDecimal(area.latitude);
  const currentLng = parseDecimal(area.longitude);
  const currentRadius = parseDecimal(area.maxRadiusKm);
  const hasValidCenter =
    area.latitude.trim() !== '' &&
    area.longitude.trim() !== '' &&
    Number.isFinite(currentLat) &&
    Number.isFinite(currentLng);
  const activeRadius =
    area.maxRadiusKm.trim() !== '' &&
    Number.isFinite(currentRadius) &&
    currentRadius > 0
      ? currentRadius
      : 15;

  return (
    <Card
      as="section"
      aria-labelledby="area-heading"
      className="relative overflow-hidden rounded-[10px_28px_10px_28px] border-2 border-[#147539] bg-gradient-to-br from-[#f6faec] via-[#eff6e0] to-[#e7f1d3] p-5 shadow-[5px_5px_0_0_#3c903b] transition-all duration-300 sm:p-6 dark:from-[#13221c] dark:via-[#162820] dark:to-[#192d24]"
    >
      <div className="grid gap-3 border-b-2 border-dashed border-[#3c903b]/35 pb-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <NeonCutTag
            step="02"
            label="Cobertura en Lima y Callao"
            variant="emerald"
          />
          <span
            className={cx(
              'inline-flex -skew-x-6 items-center gap-1.5 rounded-[10px_3px_10px_3px] border-2 px-3 py-0.5 font-display text-xs font-bold shadow-[2px_2px_0_0_#006838]',
              areaReady
                ? 'border-[#006838] bg-[#d0dc15] text-[#0b1f17]'
                : 'border-[#006838] bg-[#fde902] text-[#0b1f17]',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-[#006838] animate-pulse" />
            {areaReady ? `${profile.maxRadiusKm} km radius` : 'Not set'}
          </span>
        </div>

        <div className="grid gap-1 pt-1">
          <h2
            id="area-heading"
            className="m-0 flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="inline-block h-6 w-2.5 -skew-x-12 rounded-sm bg-[#5fba46] ring-2 ring-[#006838]"
            />
            Service area
          </h2>
          <p className="m-0 text-[15px] font-medium text-muted">
            Pick your base sector in Lima; each card updates its distance in km
            live against your radius.
          </p>
        </div>
      </div>

      {/* Marco visual con Radar en Vivo + espacio listo para tu GIF (public/technician-showcase.gif) */}
      <div className="mb-5 flex items-center justify-between gap-4 rounded-[20px_6px_20px_6px] border-2 border-[#006838] bg-gradient-to-r from-[#147539] via-[#28833a] to-[#3c903b] p-4 text-white shadow-[4px_4px_0_0_#006838]">
        <div className="grid gap-1">
          <span className="font-display text-sm font-bold tracking-wide text-[#d0dc15] uppercase">
            Live Radar · Radio activo: {activeRadius} km
          </span>
          <span className="text-xs font-medium text-white/95">
            {hasValidCenter
              ? `Base: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`
              : 'Select a Lima zone below to set your base point'}
          </span>
        </div>

        {/* Contenedor híbrido: muestra el radar animado y, si colocas public/technician-showcase.gif, lo superpone */}
        <div
          aria-hidden="true"
          style={{ backgroundImage: SHOWCASE_GIF_BG }}
          className="relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-[14px_4px_14px_4px] border-2 border-[#d0dc15] bg-[#0b1f17] bg-cover bg-center shadow-[2px_2px_0_0_#d0dc15]"
        >
          <svg viewBox="0 0 64 64" className="h-14 w-14">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="#0b1f17"
              fillOpacity="0.65"
              stroke="#d0dc15"
              strokeWidth="2"
            />
            <circle
              cx="32"
              cy="32"
              r="20"
              fill="none"
              stroke="#76c13c"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
            <circle
              cx="32"
              cy="32"
              r={Math.min(26, Math.max(6, (activeRadius / 50) * 24))}
              fill="#d0dc15"
              fillOpacity="0.3"
              stroke="#d0dc15"
              strokeWidth="1.5"
            />
            <line
              x1="32"
              y1="32"
              x2="54"
              y2="18"
              stroke="#fde902"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="32" cy="32" r="3.5" fill="#fde902" />
          </svg>
        </div>
      </div>

      <div className="mb-5 rounded-[22px_6px_22px_6px] border-2 border-[#3c903b]/50 bg-[#e6f0d0]/70 p-3.5 dark:bg-[#162720]/70">
        <p className="m-0 pb-2.5 font-display text-xs font-bold tracking-wider text-ink uppercase">
          Lima Metropolitana & Callao · Distancia en vivo desde tu base
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {LIMA_ZONES.map((zone) => {
            const dist = hasValidCenter
              ? distanceInKm(
                  currentLat,
                  currentLng,
                  zone.latitude,
                  zone.longitude,
                )
              : null;
            const isBase = dist !== null && dist < 0.3;
            const isCovered = dist !== null && dist <= activeRadius;

            return (
              <button
                key={zone.name}
                type="button"
                onClick={() => applyZonePreset(zone)}
                className={cx(
                  'grid gap-1 rounded-[16px_5px_16px_5px] border-2 px-3.5 py-2.5 text-left transition-all duration-200 ease-out',
                  isBase
                    ? '-translate-y-0.5 border-[#006838] bg-gradient-to-br from-[#d0dc15]/75 via-[#b9d51f]/55 to-[#8cc733]/45 text-ink shadow-[3px_3px_0_0_#006838]'
                    : isCovered
                      ? 'border-[#28833a] bg-[#76c13c]/25 text-ink shadow-[2px_2px_0_0_rgba(0,104,56,0.2)] hover:-translate-y-0.5 hover:border-[#006838]'
                      : 'border-[#3c903b]/40 bg-[#f3f9e8] text-ink hover:-translate-y-0.5 hover:border-[#28833a] hover:bg-[#eaf4d7] dark:bg-[#192d24] dark:hover:bg-[#1f372c]',
                )}
              >
                <span className="flex items-center justify-between gap-1 font-display text-[14px] font-bold">
                  <span>{zone.name}</span>
                  <span
                    className={cx(
                      'rounded-[6px_2px_6px_2px] px-2 py-0.5 text-[11px] font-bold',
                      isBase
                        ? 'bg-[#006838] text-[#d0dc15]'
                        : isCovered
                          ? 'border border-[#006838]/40 bg-[#d0dc15]/60 text-[#0b1f17]'
                          : 'border border-[#3c903b]/35 bg-[#e2eed0] text-ink dark:bg-[#13221c]',
                    )}
                  >
                    {dist === null
                      ? `Sugerido ${zone.defaultRadiusKm} km`
                      : isBase
                        ? `Base · radio ${activeRadius} km`
                        : `${dist.toFixed(1)} km`}
                  </span>
                </span>
                <span className="text-xs font-medium text-muted">
                  {zone.districts}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={AREA_FIELDS}
        />
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSubmitting} className={HARMONIZED_FIELDS}>
          <legend className="visually-hidden">Service area</legend>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <TextField
              id="area-latitude"
              name="latitude"
              label="Latitude"
              inputMode="decimal"
              hint="-90 to 90"
              placeholder="-12.0464"
              value={area.latitude}
              onChange={(event) => set('latitude', event.target.value)}
              error={feedback?.fieldErrors.latitude}
            />
            <TextField
              id="area-longitude"
              name="longitude"
              label="Longitude"
              inputMode="decimal"
              hint="-180 to 180"
              placeholder="-77.0428"
              value={area.longitude}
              onChange={(event) => set('longitude', event.target.value)}
              error={feedback?.fieldErrors.longitude}
            />
            <TextField
              id="area-radius"
              name="maxRadiusKm"
              label="Radius (km)"
              inputMode="decimal"
              hint="1 to 300 km"
              placeholder="15"
              value={area.maxRadiusKm}
              onChange={(event) => set('maxRadiusKm', event.target.value)}
              error={feedback?.fieldErrors.maxRadiusKm}
            />
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={isSubmitting}
              className="rounded-[4px_14px_4px_14px] border-2 border-[#006838] bg-gradient-to-r from-[#76c13c] to-[#a3ce29] px-5 font-display text-base font-bold text-[#0b1f17] shadow-[3px_3px_0_0_#006838] transition-transform duration-150 hover:-translate-y-0.5 hover:from-[#8cc733] hover:to-[#d0dc15]"
            >
              {isSubmitting ? 'Saving…' : 'Save service area'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}

function ProfileEditor({
  initialProfile,
  types,
}: {
  initialProfile: TechnicianProfile;
  types: readonly ApplianceType[];
}) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="grid gap-6">
      {/* Banner superior con superficie salvia suave y tipografía reforzada */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[26px_8px_26px_8px] border-2 border-[#147539] bg-gradient-to-r from-[#f3f9e6] via-[#ebf4d8] to-[#e2eec8] p-4 shadow-[5px_5px_0_0_#28833a] sm:p-5 dark:from-[#13221c] dark:via-[#172a22] dark:to-[#1b3127]">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="relative grid h-14 w-14 shrink-0 rotate-2 place-items-center rounded-[18px_4px_18px_4px] border-2 border-[#006838] bg-gradient-to-br from-[#d0dc15] via-[#a3ce29] to-[#5fba46] font-display text-xl font-bold text-[#0b1f17] shadow-[3px_3px_0_0_#006838]"
          >
            <span>{initialsOf(profile.fullName)}</span>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d0dc15] opacity-80" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border border-[#006838] bg-[#fde902]" />
            </span>
          </div>

          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="m-0 font-display text-2xl font-bold tracking-tight text-ink">
                {profile.fullName}
              </p>
              <span className="inline-flex -skew-x-12 items-center gap-1.5 rounded-[10px_2px_10px_2px] border-2 border-[#006838] bg-gradient-to-r from-[#d0dc15] to-[#a3ce29] px-3 py-0.5 font-display text-xs font-bold text-[#0b1f17] shadow-[2px_2px_0_0_#006838]">
                <span className="h-2 w-2 skew-x-12 rounded-full bg-[#006838] animate-pulse" />
                <span className="skew-x-12">Verified technician account</span>
              </span>
            </div>
            <p className="m-0 text-sm font-semibold text-muted">
              {profile.email}
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-2.5 font-display text-sm font-bold">
          <span className="-skew-x-6 rounded-[12px_3px_12px_3px] border-2 border-[#147539] bg-[#d0dc15]/45 px-3.5 py-1.5 text-ink shadow-[2px_2px_0_0_#147539]">
            Experience:{' '}
            {profile.experienceYears !== undefined
              ? `${profile.experienceYears} yrs`
              : '—'}
          </span>
          <span className="-skew-x-6 rounded-[12px_3px_12px_3px] border-2 border-[#147539] bg-[#76c13c]/35 px-3.5 py-1.5 text-ink shadow-[2px_2px_0_0_#147539]">
            Specialties: {profile.applianceTypes.length}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ProfileDetailsCard
          profile={profile}
          types={types}
          onSaved={setProfile}
        />
        <ServiceAreaCard profile={profile} onSaved={setProfile} />
      </div>
    </div>
  );
}

/** /technician/profile: edit experience, specialties and coverage area. */
export function TechnicianProfilePage() {
  const query = useApiQuery(
    ['technician-profile'],
    (signal) =>
      Promise.all([
        getOwnTechnicianProfile({ signal }),
        listApplianceTypes({ signal }),
      ]),
    { keepPreviousData: false },
  );

  return (
    <section aria-labelledby="profile-title">
      <PageHeader
        titleId="profile-title"
        title="Profile"
        description="Set the appliances you repair and your coverage zone in Lima & Callao so matching requests can reach you."
        breadcrumbs={[
          { label: 'Dashboard', to: '/technician' },
          { label: 'Profile' },
        ]}
      />
      {query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !query.data ? (
        <ListSkeleton rows={2} label="Loading your profile" />
      ) : (
        <ProfileEditor initialProfile={query.data[0]} types={query.data[1]} />
      )}
    </section>
  );
}
