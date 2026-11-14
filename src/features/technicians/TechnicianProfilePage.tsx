import {
  Check,
  Compass,
  Info,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { listApplianceTypes } from '../applianceTypes/api';
import { ApplianceIcon } from '../requests/ApplianceIcon';
import { applianceLabel } from '../requests/applianceLabel';
import type { ApplianceType, TechnicianProfile } from '../../shared/api/types';
import { nearestLimaDistrict } from '../../shared/geo/limaDistricts';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Badge } from '../../shared/ui/Badge';
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

/** Ruta del GIF de brújula ubicado en `public/`. */
const COMPASS_GIF_SRC = '/technician-showcase.gif';

const QUICK_RADII = ['5', '10', '15', '25'] as const;

const PROFILE_FIELDS: readonly SummaryField[] = [
  {
    name: 'experienceYears',
    id: 'profile-experience',
    label: 'Años de experiencia',
  },
  { name: 'phone', id: 'profile-phone', label: 'Teléfono' },
  { name: 'bio', id: 'profile-bio', label: 'Biografía' },
  {
    name: 'applianceTypeIds',
    id: 'profile-appliances',
    label: 'Equipos que reparas',
  },
];

const AREA_FIELDS: readonly SummaryField[] = [
  { name: 'latitude', id: 'area-latitude', label: 'Latitud' },
  { name: 'longitude', id: 'area-longitude', label: 'Longitud' },
  { name: 'maxRadiusKm', id: 'area-radius', label: 'Radio (km)' },
];

interface LimaZonePreset {
  name: string;
  hint: string;
  latitude: number;
  longitude: number;
  defaultRadiusKm: number;
}

const LIMA_ZONES: readonly LimaZonePreset[] = [
  {
    name: 'Lima Centro',
    hint: 'Cercado · Jesús María · Lince · Breña',
    latitude: -12.0464,
    longitude: -77.0428,
    defaultRadiusKm: 12,
  },
  {
    name: 'Lima Sur',
    hint: 'VES · Chorrillos · SJM · VMT',
    latitude: -12.2125,
    longitude: -76.9372,
    defaultRadiusKm: 15,
  },
  {
    name: 'Lima Oeste',
    hint: 'Miraflores · Surco · San Borja · Barranco',
    latitude: -12.1219,
    longitude: -77.0297,
    defaultRadiusKm: 10,
  },
  {
    name: 'Lima Norte',
    hint: 'Los Olivos · Comas · Independencia · SMP',
    latitude: -11.9917,
    longitude: -77.0706,
    defaultRadiusKm: 15,
  },
  {
    name: 'Lima Este',
    hint: 'La Molina · Ate · Santa Anita · SJL',
    latitude: -12.0553,
    longitude: -76.9456,
    defaultRadiusKm: 16,
  },
  {
    name: 'Callao',
    hint: 'Bellavista · La Perla · Ventanilla',
    latitude: -12.0566,
    longitude: -77.1181,
    defaultRadiusKm: 14,
  },
];

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
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function matchedTypeIds(
  profile: TechnicianProfile,
  types: readonly ApplianceType[],
): number[] {
  const active = new Set(
    profile.applianceTypes.map((name) => name.trim().toLowerCase()),
  );
  return types
    .filter(
      (t) =>
        active.has(t.name.trim().toLowerCase()) ||
        active.has(applianceLabel(t.name).trim().toLowerCase()),
    )
    .map((t) => t.id);
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
  const [showMore, setShowMore] = useState(false);
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
      toast.success('Perfil actualizado.');
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
      className="spot-card spot-tint grid gap-5 rounded-[22px] border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 pb-4">
        <div className="grid gap-1">
          <span className="eyebrow inline-flex items-center gap-1.5 text-brand">
            <Wrench size={14} aria-hidden="true" />
            Especialidades y oficio
          </span>
          <h2 id="profile-heading" className="m-0 text-xl font-bold">
            Datos profesionales
          </h2>
        </div>
        {profile.applianceTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.applianceTypes.map((name) => (
              <Badge key={name} tone="brand">
                {applianceLabel(name)}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={PROFILE_FIELDS}
        />
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSubmitting} className="form-fields">
          <legend className="visually-hidden">Datos profesionales</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              id="profile-experience"
              name="experienceYears"
              label="Años de experiencia"
              inputMode="numeric"
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
              label="Teléfono"
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
            label="Biografía"
            hint="Marcas que dominas, diagnóstico y garantía."
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
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <span
                  id="profile-appliances-label"
                  className="font-display text-base font-bold"
                >
                  Equipos que reparas
                </span>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand tabular-nums">
                  {form.applianceTypeIds.length} de {types.length}
                </span>
              </div>
              <button
                type="button"
                aria-expanded={showMore}
                onClick={() => setShowMore((prev) => !prev)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface-2/80 px-3 py-1 text-xs font-semibold text-ink transition-all duration-200 hover:border-brand hover:bg-brand-soft hover:text-brand"
              >
                <Info size={13} aria-hidden="true" />
                {showMore ? 'Ocultar detalles' : 'Saber más'}
              </button>
            </div>

            {showMore ? (
              <div className="rise mb-3 grid gap-2 rounded-2xl border border-brand/25 bg-brand-soft/35 p-3.5 text-xs text-ink">
                <p className="m-0 font-semibold text-brand">
                  <Sparkles
                    size={13}
                    aria-hidden="true"
                    className="mr-1 inline"
                  />
                  Filtro inteligente de compatibilidad
                </p>
                <p className="m-0 text-muted">
                  Tu panel y el radar de oportunidades muestran únicamente las
                  solicitudes de clientes que coinciden con las líneas que
                  actives aquí.
                </p>
              </div>
            ) : null}

            {/* Tarjetas horizontales interactivas con iluminación y elevación */}
            <div className="stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {types.map((type) => {
                const checked = form.applianceTypeIds.includes(type.id);
                return (
                  <label
                    key={type.id}
                    className={cx(
                      'group/tile relative flex cursor-pointer flex-col justify-between gap-2.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-250 hover:-translate-y-1',
                      checked
                        ? 'border-brand bg-gradient-to-br from-brand-soft via-surface to-brand-soft/40 text-ink shadow-[0_12px_24px_-10px_rgb(201_74_20/32%)]'
                        : 'border-line bg-surface-2/40 text-ink hover:border-brand/50 hover:bg-surface hover:shadow-[0_12px_24px_-12px_rgb(28_25_23/18%)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(type.id)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span
                        aria-hidden="true"
                        className={cx(
                          'grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-250 group-hover/tile:scale-110',
                          checked
                            ? 'bg-brand text-on-brand shadow-card'
                            : 'bg-surface text-muted shadow-card group-hover/tile:bg-brand-soft group-hover/tile:text-brand',
                        )}
                      >
                        <ApplianceIcon name={type.name} size={20} />
                      </span>
                      <span
                        aria-hidden="true"
                        className={cx(
                          'grid size-5 place-items-center rounded-full border transition-all duration-200',
                          checked
                            ? 'border-brand bg-brand text-on-brand scale-105'
                            : 'border-line bg-surface group-hover/tile:border-brand/60',
                        )}
                      >
                        {checked ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                    </div>
                    <div className="grid gap-0.5">
                      <span className="font-display text-sm leading-tight font-bold text-ink">
                        {applianceLabel(type.name)}
                      </span>
                      {showMore && type.description ? (
                        <span className="line-clamp-2 text-[11px] text-muted">
                          {type.description}
                        </span>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
            {feedback?.fieldErrors.applianceTypeIds ? (
              <p className="field-error pt-1.5">
                {feedback.fieldErrors.applianceTypeIds}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <Button type="submit" loading={isSubmitting} className="sweep">
              {isSubmitting ? 'Guardando…' : 'Guardar perfil'}
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
  const [showZonesInfo, setShowZonesInfo] = useState(false);
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
      toast.success('Zona de servicio actualizada.');
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof ServiceAreaForm>(name: K, value: string) {
    setArea((current) => ({ ...current, [name]: value }));
  }

  function applyZonePreset(zone: LimaZonePreset) {
    setArea({
      latitude: String(zone.latitude),
      longitude: String(zone.longitude),
      maxRadiusKm: String(zone.defaultRadiusKm),
    });
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
  const detectedDistrict = hasValidCenter
    ? nearestLimaDistrict(currentLat, currentLng)
    : null;

  return (
    <Card
      as="section"
      aria-labelledby="area-heading"
      className="spot-card spot-tint grid gap-5 rounded-[22px] border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 pb-4">
        <div className="grid gap-1">
          <span className="eyebrow inline-flex items-center gap-1.5 text-cobalt">
            <Compass size={14} aria-hidden="true" />
            Lima Metropolitana y Callao
          </span>
          <h2 id="area-heading" className="m-0 text-xl font-bold">
            Zona de servicio
          </h2>
        </div>
        <Badge tone={areaReady ? 'success' : 'warning'}>
          {areaReady ? `Radio de ${profile.maxRadiusKm} km` : 'Sin configurar'}
        </Badge>
      </div>

      {/* Tarjeta de Base con borde luminoso .ai-glow, GIF de brújula y píldoras de radio */}
      <div className="ai-glow relative rounded-2xl p-[1.5px]">
        <div className="group flex flex-wrap items-center justify-between gap-4 rounded-[15px] bg-surface p-4 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-brand/30 bg-brand-soft/40 p-1 shadow-card">
              <img
                src={COMPASS_GIF_SRC}
                alt=""
                aria-hidden="true"
                className="size-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span
                aria-hidden="true"
                className="pulse-fresh absolute right-1 bottom-1 size-2.5 rounded-full bg-fresh ring-2 ring-surface"
              />
            </div>
            <div className="grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-display text-base font-extrabold text-ink">
                  <MapPin size={15} aria-hidden="true" className="text-brand" />
                  {detectedDistrict
                    ? `Base en ${detectedDistrict}`
                    : 'Selecciona tu sector base'}
                </span>
                <span className="rounded-full bg-fresh-soft px-2.5 py-0.5 text-[11px] font-bold text-fresh-strong tabular-nums">
                  {activeRadius} km a la redonda
                </span>
              </div>
              <span className="text-xs text-muted tabular-nums">
                {hasValidCenter
                  ? `Coordenadas activas: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`
                  : 'Elige una tarjeta de sector abajo para fijar tu punto'}
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Radio rápido"
            className="flex items-center gap-1 rounded-full bg-surface-2 p-1"
          >
            {QUICK_RADII.map((km) => {
              const active = area.maxRadiusKm.trim() === km;
              return (
                <button
                  key={km}
                  type="button"
                  onClick={() => set('maxRadiusKm', km)}
                  className={cx(
                    'min-h-7 rounded-full border-0 px-2.5 text-xs font-bold tabular-nums transition-all duration-200',
                    active
                      ? 'bg-brand text-on-brand shadow-card'
                      : 'bg-transparent text-muted hover:text-ink',
                  )}
                >
                  {km} km
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sectores rápidos en bloques horizontales dinámicos + botón Saber más */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-sm font-bold text-ink">
            Sectores rápidos de Lima y Callao
          </span>
          <button
            type="button"
            aria-expanded={showZonesInfo}
            onClick={() => setShowZonesInfo((prev) => !prev)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface-2/80 px-3 py-1 text-xs font-semibold text-ink transition-all duration-200 hover:border-cobalt hover:bg-cobalt-soft hover:text-cobalt"
          >
            <Info size={13} aria-hidden="true" />
            {showZonesInfo ? 'Ocultar distritos' : 'Saber más'}
          </button>
        </div>

        {showZonesInfo ? (
          <div className="rise grid gap-2 rounded-2xl border border-cobalt/25 bg-cobalt-soft/40 p-3.5 text-xs text-ink">
            <div className="flex flex-wrap items-center gap-3 font-semibold">
              <span className="inline-flex items-center gap-1.5 text-brand">
                <span className="size-2 rounded-full bg-brand" /> Base elegida
              </span>
              <span className="inline-flex items-center gap-1.5 text-fresh-strong">
                <span className="size-2 rounded-full bg-fresh" /> Dentro de tu
                radio
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full bg-line" /> Fuera de radio
              </span>
            </div>
            <p className="m-0 text-muted">
              Al elegir un sector se cargan sus coordenadas céntricas y se
              calcula en vivo qué otras zonas de Lima alcanzas con tu radio
              actual.
            </p>
          </div>
        ) : null}

        <div className="stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
                  'group/zone relative flex flex-col justify-between gap-2 rounded-2xl border p-3.5 text-left transition-all duration-250 hover:-translate-y-1',
                  isBase
                    ? 'border-brand bg-gradient-to-br from-brand-soft via-surface to-brand-soft/45 text-ink shadow-[0_12px_24px_-10px_rgb(201_74_20/32%)]'
                    : isCovered
                      ? 'border-fresh/45 bg-gradient-to-br from-fresh-soft/75 via-surface to-fresh-soft/30 text-ink hover:border-fresh hover:shadow-[0_12px_24px_-10px_rgb(5_150_105/25%)]'
                      : 'border-line bg-surface-2/40 text-ink hover:border-cobalt/45 hover:bg-surface hover:shadow-[0_12px_24px_-12px_rgb(28_25_23/18%)]',
                )}
              >
                <div className="flex w-full items-center justify-between gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'size-2.5 shrink-0 rounded-full transition-transform duration-200 group-hover/zone:scale-125',
                      isBase
                        ? 'pulse-dot bg-brand'
                        : isCovered
                          ? 'bg-fresh'
                          : 'bg-line group-hover/zone:bg-cobalt',
                    )}
                  />
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors',
                      isBase
                        ? 'bg-brand text-on-brand'
                        : isCovered
                          ? 'bg-fresh-soft text-fresh-strong'
                          : 'bg-surface text-muted group-hover/zone:text-ink',
                    )}
                  >
                    {dist === null
                      ? `${zone.defaultRadiusKm} km`
                      : isBase
                        ? 'Base'
                        : `${dist.toFixed(1)} km`}
                  </span>
                </div>

                <div className="grid gap-0.5">
                  <span className="font-display text-sm font-extrabold text-ink">
                    {zone.name}
                  </span>
                  {showZonesInfo ? (
                    <span className="line-clamp-2 text-[11px] leading-snug text-muted">
                      {zone.hint}
                    </span>
                  ) : null}
                </div>
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
        <fieldset disabled={isSubmitting} className="form-fields">
          <legend className="visually-hidden">Zona de servicio</legend>
          <div className="grid gap-x-3 sm:grid-cols-3">
            <TextField
              id="area-latitude"
              name="latitude"
              label="Latitud"
              inputMode="decimal"
              placeholder="-12.0464"
              value={area.latitude}
              onChange={(event) => set('latitude', event.target.value)}
              error={feedback?.fieldErrors.latitude}
            />
            <TextField
              id="area-longitude"
              name="longitude"
              label="Longitud"
              inputMode="decimal"
              placeholder="-77.0428"
              value={area.longitude}
              onChange={(event) => set('longitude', event.target.value)}
              error={feedback?.fieldErrors.longitude}
            />
            <TextField
              id="area-radius"
              name="maxRadiusKm"
              label="Radio (km)"
              inputMode="decimal"
              placeholder="15"
              value={area.maxRadiusKm}
              onChange={(event) => set('maxRadiusKm', event.target.value)}
              error={feedback?.fieldErrors.maxRadiusKm}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" loading={isSubmitting} className="sweep">
              {isSubmitting ? 'Guardando…' : 'Guardar zona de servicio'}
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
    <div className="rise grid gap-6">
      <div className="float-shadow flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[var(--rm-cover-line)] p-5 [background-image:var(--rm-cover-bg)] sm:p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-bold text-bg shadow-card transition-transform duration-300 hover:scale-105"
          >
            {initialsOf(profile.fullName)}
          </span>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="m-0 font-display text-xl font-extrabold tracking-tight text-ink">
                {profile.fullName}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fresh/25 bg-fresh-soft px-3 py-0.5 text-xs font-semibold text-fresh-strong">
                <span
                  aria-hidden="true"
                  className="pulse-fresh size-2 rounded-full bg-fresh"
                />
                Técnico verificado
              </span>
            </div>
            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{profile.email}</span>
              {profile.phone ? (
                <span className="inline-flex items-center gap-1 text-slate">
                  <Phone size={13} aria-hidden="true" className="text-cobalt" />
                  {profile.phone}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <dl className="m-0 flex flex-wrap gap-2.5">
          <div className="lift rounded-2xl border border-line bg-surface/95 px-4 py-2 shadow-card">
            <dt className="text-xs text-muted">Experiencia</dt>
            <dd className="m-0 font-display text-base font-extrabold tabular-nums">
              {profile.experienceYears !== undefined
                ? `${profile.experienceYears} años`
                : '—'}
            </dd>
          </div>
          <div className="lift rounded-2xl border border-line bg-surface/95 px-4 py-2 shadow-card">
            <dt className="text-xs text-muted">Especialidades</dt>
            <dd className="m-0 font-display text-base font-extrabold tabular-nums">
              {profile.applianceTypes.length}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
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

/** /technician/profile: edita experiencia, especialidades y zona de cobertura. */
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
    <section aria-labelledby="profile-title" className="grid gap-6">
      <PageHeader
        titleId="profile-title"
        title="Perfil"
        description="Configura tus especialidades y tu radio de atención en Lima y Callao."
        breadcrumbs={[
          { label: 'Inicio', to: '/technician' },
          { label: 'Perfil' },
        ]}
      />
      {query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !query.data ? (
        <ListSkeleton rows={2} label="Cargando tu perfil" />
      ) : (
        <ProfileEditor initialProfile={query.data[0]} types={query.data[1]} />
      )}
    </section>
  );
}
