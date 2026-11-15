import {
  BadgeCheck,
  Briefcase,
  Check,
  Compass,
  Crosshair,
  ExternalLink,
  Home,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Phone,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
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
  extractCoordsFromText,
  latLngToWorldPx,
  PHONE_MAX,
  parseDecimal,
  reverseGeocodeMapPin,
  searchMapAddresses,
  TILE_SIZE,
  validateProfile,
  validateServiceArea,
  worldPxToLatLng,
  type AddressSuggestion,
  type ProfileForm,
  type ServiceAreaForm,
} from './validation';

/** Ruta del GIF de brújula ubicado en `public/`. */
const COMPASS_GIF_SRC = '/technician-showcase.gif';

const QUICK_RADII = ['5', '10', '15', '25'] as const;
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;
const VIEWPORT_W = 640;
const VIEWPORT_H = 380;

const PLACE_TAGS = [
  { id: 'taller', label: 'Mi taller', icon: Briefcase },
  { id: 'casa', label: 'Mi casa', icon: Home },
  { id: 'otro', label: 'Otro punto', icon: MapPin },
] as const;

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
  { name: 'latitude', id: 'area-search', label: 'Ubicación en el mapa' },
  { name: 'longitude', id: 'area-longitude', label: 'Longitud' },
  { name: 'maxRadiusKm', id: 'area-radius', label: 'Radio (km)' },
];

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
                            ? 'scale-105 border-brand bg-brand text-on-brand'
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
  const [area, setArea] = useState<ServiceAreaForm>(() => ({
    latitude: profile.latitude !== undefined ? String(profile.latitude) : '',
    longitude: profile.longitude !== undefined ? String(profile.longitude) : '',
    maxRadiusKm:
      profile.maxRadiusKm !== undefined ? String(profile.maxRadiusKm) : '15',
  }));

  const currentLat = parseDecimal(area.latitude);
  const currentLng = parseDecimal(area.longitude);
  const currentRadius = parseDecimal(area.maxRadiusKm);
  const hasValidCenter =
    area.latitude.trim() !== '' &&
    area.longitude.trim() !== '' &&
    Number.isFinite(currentLat) &&
    Number.isFinite(currentLng) &&
    currentLat >= -90 &&
    currentLat <= 90 &&
    currentLng >= -180 &&
    currentLng <= 180;

  const [viewCenter, setViewCenter] = useState(() => ({
    lat: hasValidCenter ? currentLat : -12.0464,
    lng: hasValidCenter ? currentLng : -77.0428,
  }));
  const [zoom, setZoom] = useState(() => (hasValidCenter ? 15 : 12));
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [placeTag, setPlaceTag] =
    useState<(typeof PLACE_TAGS)[number]['id']>('taller');
  const [locating, setLocating] = useState(false);
  const [dragAction, setDragAction] = useState<null | {
    kind: 'pin' | 'pan';
    startClientX: number;
    startClientY: number;
    startWorldX: number;
    startWorldY: number;
  }>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { feedback, summaryRef, show, clear } = useFormFeedback();

  // Búsqueda real de direcciones en Perú mientras el técnico escribe
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!dropdownOpen || trimmed.length < 2 || extractCoordsFromText(trimmed)) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchMapAddresses(trimmed, controller.signal)
        .then((items) => {
          setSuggestions(items);
          setSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setSearching(false);
          }
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, dropdownOpen]);

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

  function applyCoordinates(
    latitude: number,
    longitude: number,
    label?: string,
    nextZoom?: number,
  ) {
    clear();
    setArea((current) => ({
      ...current,
      latitude: String(latitude),
      longitude: String(longitude),
    }));
    setViewCenter({ lat: latitude, lng: longitude });
    if (nextZoom !== undefined) setZoom(nextZoom);
    if (label) {
      setSelectedLabel(label);
      setSearchQuery(label);
    }
  }

  function selectSuggestion(item: AddressSuggestion) {
    applyCoordinates(item.latitude, item.longitude, item.primary, 16);
    setDropdownOpen(false);
    setSuggestions([]);
    setSearching(false);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    const extracted = extractCoordsFromText(value);
    if (extracted) {
      const district = nearestLimaDistrict(
        extracted.latitude,
        extracted.longitude,
      );
      applyCoordinates(extracted.latitude, extracted.longitude, undefined, 16);
      setSelectedLabel(
        district ? `${district}, Lima, Perú` : 'Ubicación en Google Maps',
      );
      setDropdownOpen(false);
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const shouldSearch = value.trim().length >= 2;
    setDropdownOpen(shouldSearch);
    if (!shouldSearch) {
      setSuggestions([]);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      toast.error('Tu navegador no permite detectar la ubicación actual.');
      return;
    }
    setLocating(true);
    clear();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const district = nearestLimaDistrict(lat, lng);
        const fallbackLabel = district
          ? `${district}, Lima, Perú`
          : 'Mi ubicación actual';
        applyCoordinates(lat, lng, fallbackLabel, 16);
        setDropdownOpen(false);
        setLocating(false);
        toast.success('Ubicación actual detectada en Google Maps.');
        void reverseGeocodeMapPin(lat, lng).then((resolved) => {
          if (resolved) {
            setSelectedLabel(resolved);
            setSearchQuery(resolved);
          }
        });
      },
      () => {
        setLocating(false);
        toast.error(
          'No se pudo obtener tu ubicación actual. Búscala en el mapa.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const activeRadius =
    area.maxRadiusKm.trim() !== '' &&
    Number.isFinite(currentRadius) &&
    currentRadius > 0
      ? currentRadius
      : 15;

  const pinLat = hasValidCenter ? currentLat : viewCenter.lat;
  const pinLng = hasValidCenter ? currentLng : viewCenter.lng;

  // Cálculo Web Mercator exacto en el nivel de zoom actual
  const centerWorldPx = latLngToWorldPx(viewCenter.lat, viewCenter.lng, zoom);
  const topLeftWorldX = centerWorldPx.x - VIEWPORT_W / 2;
  const topLeftWorldY = centerWorldPx.y - VIEWPORT_H / 2;

  const pinWorldPx = latLngToWorldPx(pinLat, pinLng, zoom);
  const pinScreenX = pinWorldPx.x - topLeftWorldX;
  const pinScreenY = pinWorldPx.y - topLeftWorldY;

  const maxTileIndex = Math.pow(2, zoom) - 1;
  const minTileX = Math.floor(topLeftWorldX / TILE_SIZE);
  const maxTileX = Math.floor((topLeftWorldX + VIEWPORT_W) / TILE_SIZE);
  const minTileY = Math.max(
    0,
    Math.min(maxTileIndex, Math.floor(topLeftWorldY / TILE_SIZE)),
  );
  const maxTileY = Math.max(
    0,
    Math.min(
      maxTileIndex,
      Math.floor((topLeftWorldY + VIEWPORT_H) / TILE_SIZE),
    ),
  );

  const tiles: {
    key: string;
    url: string;
    left: number;
    top: number;
  }[] = [];
  const tileMod = Math.pow(2, zoom);
  for (let tx = minTileX; tx <= maxTileX; tx += 1) {
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      const wrappedX = ((tx % tileMod) + tileMod) % tileMod;
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://mt1.google.com/vt/lyrs=m&x=${wrappedX}&y=${ty}&z=${zoom}&hl=es`,
        left: tx * TILE_SIZE - topLeftWorldX,
        top: ty * TILE_SIZE - topLeftWorldY,
      });
    }
  }

  function scaleDelta(
    clientX: number,
    clientY: number,
    startX: number,
    startY: number,
  ) {
    const rect = viewportRef.current?.getBoundingClientRect();
    const scaleX = rect && rect.width > 0 ? VIEWPORT_W / rect.width : 1;
    const scaleY = rect && rect.height > 0 ? VIEWPORT_H / rect.height : 1;
    return {
      dx: (clientX - startX) * scaleX,
      dy: (clientY - startY) * scaleY,
    };
  }

  function startPinDrag(event: ReactMouseEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();
    setDragAction({
      kind: 'pin',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: pinWorldPx.x,
      startWorldY: pinWorldPx.y,
    });
  }

  function startMapPan(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    setDragAction({
      kind: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: centerWorldPx.x,
      startWorldY: centerWorldPx.y,
    });
  }

  function handleSurfaceMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragAction) return;
    const { dx, dy } = scaleDelta(
      event.clientX,
      event.clientY,
      dragAction.startClientX,
      dragAction.startClientY,
    );

    if (dragAction.kind === 'pin') {
      const next = worldPxToLatLng(
        dragAction.startWorldX + dx,
        dragAction.startWorldY + dy,
        zoom,
      );
      clear();
      setArea((current) => ({
        ...current,
        latitude: String(next.latitude),
        longitude: String(next.longitude),
      }));
      const district = nearestLimaDistrict(next.latitude, next.longitude);
      setSelectedLabel(
        district
          ? `${district}, Lima, Perú`
          : `${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)}`,
      );
    } else {
      const nextCenter = worldPxToLatLng(
        dragAction.startWorldX - dx,
        dragAction.startWorldY - dy,
        zoom,
      );
      setViewCenter({ lat: nextCenter.latitude, lng: nextCenter.longitude });
    }
  }

  function finishSurfaceDrag() {
    if (!dragAction) return;
    const wasPin = dragAction.kind === 'pin';
    setDragAction(null);
    if (wasPin && hasValidCenter) {
      void reverseGeocodeMapPin(currentLat, currentLng).then((resolved) => {
        if (resolved) {
          setSelectedLabel(resolved);
          setSearchQuery(resolved);
        }
      });
    }
  }

  function handleZoomChange(delta: number) {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      if (hasValidCenter) {
        setViewCenter({ lat: currentLat, lng: currentLng });
      }
      return next;
    });
  }

  function centerPinOnCurrentView() {
    const nextLat = Number(viewCenter.lat.toFixed(6));
    const nextLng = Number(viewCenter.lng.toFixed(6));
    const district = nearestLimaDistrict(nextLat, nextLng);
    applyCoordinates(
      nextLat,
      nextLng,
      district ? `${district}, Lima, Perú` : undefined,
    );
    void reverseGeocodeMapPin(nextLat, nextLng).then((resolved) => {
      if (resolved) {
        setSelectedLabel(resolved);
        setSearchQuery(resolved);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateServiceArea(area);
    if (Object.keys(errors).length > 0) {
      if (errors.latitude || errors.longitude) {
        setShowManualCoords(true);
      }
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void save();
  }

  const areaReady =
    profile.latitude !== undefined &&
    profile.longitude !== undefined &&
    profile.maxRadiusKm !== undefined;

  const detectedDistrict = hasValidCenter
    ? nearestLimaDistrict(currentLat, currentLng)
    : null;

  const googleMapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    hasValidCenter ? `${pinLat},${pinLng}` : searchQuery.trim() || 'Lima, Peru',
  )}`;

  return (
    <Card
      as="section"
      aria-labelledby="area-heading"
      className="spot-card spot-tint grid gap-5 rounded-[22px] border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 pb-4">
        <div className="grid gap-1">
          <span className="eyebrow inline-flex items-center gap-1.5 text-brand">
            <Compass size={14} aria-hidden="true" />
            Google Maps · Lima y Callao
          </span>
          <h2 id="area-heading" className="m-0 text-xl font-bold">
            Zona de servicio
          </h2>
        </div>
        <Badge tone={areaReady ? 'success' : 'warning'}>
          {areaReady ? `Radio de ${profile.maxRadiusKm} km` : 'Sin configurar'}
        </Badge>
      </div>

      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={AREA_FIELDS}
        />
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <fieldset disabled={isSubmitting} className="form-fields grid gap-5">
          <legend className="visually-hidden">Zona de servicio</legend>

          {/* Buscador conectado a geocodificación real de Perú estilo Inkafarma */}
          <div className="grid gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="area-search"
                className="font-display text-sm font-bold text-ink"
              >
                Dirección
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3.5 py-1 text-xs font-bold text-brand transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-on-brand"
              >
                <LocateFixed size={13} aria-hidden="true" />
                {locating ? 'Ubicando GPS…' : 'Usar mi ubicación actual'}
              </button>
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card transition-all duration-200 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand-soft">
                <MapPin
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-brand"
                />
                <input
                  id="area-search"
                  type="search"
                  autoComplete="off"
                  value={searchQuery}
                  onFocus={() =>
                    setDropdownOpen(searchQuery.trim().length >= 2)
                  }
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Busca cualquier calle, avenida, jirón o distrito (ej. Chepén, Av. Larco)…"
                  className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
                />
                {searching ? (
                  <Loader2
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 animate-spin text-muted"
                  />
                ) : null}
              </div>

              {/* Sugerencias flotantes reales devueltas por el geocodificador */}
              {dropdownOpen && suggestions.length > 0 ? (
                <ul
                  role="listbox"
                  aria-label="Sugerencias de dirección"
                  className="rise absolute inset-x-0 top-[calc(100%+6px)] z-30 m-0 grid list-none overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_20px_38px_-12px_rgb(28_25_23/28%)]"
                >
                  {suggestions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectSuggestion(item)}
                        className="group/item flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-colors group-hover/item:bg-brand-soft group-hover/item:text-brand"
                        >
                          <MapPin size={16} />
                        </span>
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate font-display text-sm font-bold text-ink">
                            {item.primary}
                          </span>
                          <span className="truncate text-xs text-muted">
                            {item.secondary}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-muted">
                ¿Cómo la quieres llamar?
              </span>
              {PLACE_TAGS.map((tag) => {
                const Icon = tag.icon;
                const active = placeTag === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPlaceTag(tag.id)}
                    className={cx(
                      'inline-flex min-h-8 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-all duration-200',
                      active
                        ? 'border-brand bg-brand-soft/70 text-brand shadow-card'
                        : 'border-line bg-surface text-muted hover:border-ink/30 hover:text-ink',
                    )}
                  >
                    <Icon size={13} aria-hidden="true" />
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mapa Google Maps sincronizado en tiempo real con zoom, paneo y arrastre de pin */}
          <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface-2 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <img
                  src={COMPASS_GIF_SRC}
                  alt=""
                  aria-hidden="true"
                  className="size-8 rounded-lg border border-line object-cover"
                />
                <div className="grid">
                  <span className="font-display text-xs font-bold text-ink">
                    {selectedLabel ??
                      (detectedDistrict
                        ? `Base en ${detectedDistrict}, Lima`
                        : 'Ubicación en Google Maps')}
                  </span>
                  <span className="text-[11px] text-muted">
                    Arrastra el mapa o mueve el pin rojo en el zoom actual (z
                    {zoom})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={centerPinOnCurrentView}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                >
                  <Crosshair size={12} aria-hidden="true" />
                  Traer pin al centro
                </button>
                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-ink no-underline transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                >
                  Ampliar
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div
              ref={viewportRef}
              role="application"
              aria-label="Mapa interactivo de Google Maps"
              onMouseDown={startMapPan}
              onMouseMove={handleSurfaceMove}
              onMouseUp={finishSurfaceDrag}
              onMouseLeave={finishSurfaceDrag}
              className="relative aspect-[16/10] w-full cursor-grab overflow-hidden select-none bg-[#e5e3df] active:cursor-grabbing"
            >
              {/* Lienzo de teselas de Google Maps sincronizadas con Web Mercator */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 origin-top-left"
                style={{
                  width: `${VIEWPORT_W}px`,
                  height: `${VIEWPORT_H}px`,
                }}
              >
                {tiles.map((tile) => (
                  <img
                    key={tile.key}
                    src={tile.url}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute size-[256px] max-w-none select-none"
                    style={{
                      left: `${tile.left}px`,
                      top: `${tile.top}px`,
                    }}
                  />
                ))}
              </div>

              {/* Pin rojo anclado a su coordenada geográfica real en el zoom actual */}
              <button
                type="button"
                aria-label="Arrastrar pin de ubicación exacta"
                onMouseDown={startPinDrag}
                style={{
                  left: `${(pinScreenX / VIEWPORT_W) * 100}%`,
                  top: `${(pinScreenY / VIEWPORT_H) * 100}%`,
                }}
                className="group/pin absolute z-20 -translate-x-1/2 -translate-y-full cursor-grab border-0 bg-transparent p-0 focus:outline-none active:cursor-grabbing"
              >
                <span className="mb-1 block whitespace-nowrap rounded-full bg-ink/90 px-2.5 py-0.5 text-[10px] font-bold text-bg shadow-card">
                  {dragAction?.kind === 'pin'
                    ? 'Suelta en tu dirección'
                    : 'Arrastra el pin'}
                </span>
                <span className="relative grid place-items-center">
                  <svg
                    viewBox="0 0 36 44"
                    className={cx(
                      'h-10 w-8 drop-shadow-[0_6px_10px_rgba(0,0,0,0.38)] transition-transform duration-150 group-hover/pin:scale-110',
                      dragAction?.kind === 'pin' &&
                        '-translate-y-1.5 scale-115',
                    )}
                    aria-hidden="true"
                  >
                    <path
                      d="M18 1C8.6 1 1 8.6 1 18c0 11.8 15.2 24.1 16.1 24.8a1.5 1.5 0 0 0 1.8 0C19.8 42.1 35 29.8 35 18 35 8.6 27.4 1 18 1Z"
                      fill="#ea4335"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle cx="18" cy="18" r="6" fill="#960a0a" />
                  </svg>
                  <span className="h-1.5 w-4 rounded-full bg-ink/35 blur-[1px]" />
                </span>
              </button>

              {/* Controles de Zoom sincronizados con la proyección del pin */}
              <div
                onMouseDown={(event) => event.stopPropagation()}
                className="absolute right-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
              >
                <button
                  type="button"
                  aria-label="Acercar mapa"
                  onClick={() => handleZoomChange(1)}
                  disabled={zoom >= MAX_ZOOM}
                  className="grid size-9 place-items-center border-0 border-b border-line bg-surface text-ink transition-colors hover:bg-surface-2"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Alejar mapa"
                  onClick={() => handleZoomChange(-1)}
                  disabled={zoom <= MIN_ZOOM}
                  className="grid size-9 place-items-center border-0 bg-surface text-ink transition-colors hover:bg-surface-2"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Radio de cobertura + Ajuste fino de coordenadas */}
          <div className="grid gap-3 rounded-2xl border border-line bg-surface-2/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold text-ink">
                Distancia máxima de desplazamiento ({activeRadius} km)
              </span>
              <div
                role="group"
                aria-label="Radio rápido"
                className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-card"
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

            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
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
              <button
                type="button"
                aria-expanded={showManualCoords}
                onClick={() => setShowManualCoords((prev) => !prev)}
                className="mb-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-muted transition-colors hover:border-ink/40 hover:text-ink"
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                {showManualCoords ? 'Ocultar coordenadas' : 'Ajustar pin'}
              </button>
            </div>

            {showManualCoords ? (
              <div className="rise grid gap-x-3 border-t border-line pt-3 sm:grid-cols-2">
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
              </div>
            ) : null}
          </div>

          <div>
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
      <div className="spot-card spot-tint group/header flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-line bg-surface p-5 shadow-card transition-all duration-300 sm:p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-2xl border border-brand/25 bg-brand-soft font-display text-lg font-extrabold text-brand shadow-card transition-transform duration-300 group-hover/header:-rotate-3 group-hover/header:scale-105"
          >
            {initialsOf(profile.fullName)}
          </span>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="m-0 font-display text-2xl font-extrabold tracking-tight capitalize text-ink transition-colors duration-300 group-hover/header:text-brand">
                {profile.fullName}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft/75 px-3 py-0.5 text-xs font-semibold text-brand">
                <BadgeCheck size={14} aria-hidden="true" />
                Técnico verificado
              </span>
            </div>
            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{profile.email}</span>
              {profile.phone ? (
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <Phone size={13} aria-hidden="true" className="text-brand" />
                  {profile.phone}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <dl className="m-0 flex flex-wrap gap-2.5">
          <div className="lift rounded-2xl border border-line bg-surface-2/60 px-4 py-2">
            <dt className="text-xs text-muted">Experiencia</dt>
            <dd className="m-0 font-display text-base font-extrabold tabular-nums">
              {profile.experienceYears !== undefined
                ? `${profile.experienceYears} años`
                : '—'}
            </dd>
          </div>
          <div className="lift rounded-2xl border border-line bg-surface-2/60 px-4 py-2">
            <dt className="text-xs text-muted">Especialidades</dt>
            <dd className="m-0 font-display text-base font-extrabold tabular-nums">
              {profile.applianceTypes.length}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
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

/** /technician/profile: edita experiencia, especialidades y ubicación con Google Maps. */
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
        description="Configura tus especialidades y ubica tu punto de partida en Google Maps."
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
