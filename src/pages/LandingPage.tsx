import {
  ArrowRight,
  Camera,
  Check,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { roleHome } from '../features/auth/redirects';
import { ApplianceIcon } from '../features/requests/ApplianceIcon';
import { useReveal } from '../shared/hooks/useReveal';
import { Scene } from './landing/Scene';
import { cx } from '../shared/ui/cx';

const CHIPS = [
  { value: 'aire-acondicionado', label: 'Aire acond.' },
  { value: 'lavadora', label: 'Lavadora' },
  { value: 'refrigeradora', label: 'Refrigeradora' },
  { value: 'horno', label: 'Horno' },
  { value: 'microondas', label: 'Microondas' },
] as const;

const SPECIALTIES = [
  {
    value: 'lavadora',
    title: 'Lavadoras',
    icon: 'Washing Machine',
    from: 40,
    near: 22,
  },
  {
    value: 'aire-acondicionado',
    title: 'Aire acondicionado',
    icon: 'Air Conditioner',
    from: 45,
    near: 18,
  },
  {
    value: 'refrigeradora',
    title: 'Refrigeradoras',
    icon: 'Refrigerator',
    from: 50,
    near: 15,
  },
  {
    value: 'horno',
    title: 'Hornos y cocinas',
    icon: 'Oven',
    from: 35,
    near: 14,
  },
] as const;

const SHOWCASE = [
  {
    tab: 'Lavadora no desagua',
    photo: 'hero-lavadora',
    appliance: 'Washing Machine',
    tone: 'warm',
    request: 'Lavadora Samsung · Miraflores',
    diagnosis: 'Posible bomba de desagüe obstruida',
    offers: [
      ['CQ', 'Carlos Quispe', '5.0', 'Diagnóstico a domicilio', 45],
      ['LM', 'Luis Mendoza', '4.9', 'Cambio de bomba incluido', 55],
    ],
  },
  {
    tab: 'Aire gotea',
    photo: 'hero-aire',
    appliance: 'Air Conditioner',
    tone: 'cool',
    request: 'Split LG · Surco',
    diagnosis: 'Drenaje de condensado tapado',
    offers: [
      ['RT', 'Rosa Torres', '4.9', 'Limpieza y drenaje', 60],
      ['JV', 'Jorge Vega', '4.8', 'Revisión de gas incluida', 75],
    ],
  },
  {
    tab: 'Refri no enfría',
    photo: 'hero-refri',
    appliance: 'Refrigerator',
    tone: 'sage',
    request: 'Refrigeradora Bosch · San Borja',
    diagnosis: 'Falla probable en el termostato',
    offers: [
      ['AP', 'Ana Paredes', '5.0', 'Diagnóstico y repuesto', 70],
      ['CQ', 'Carlos Quispe', '5.0', 'Visita hoy mismo', 50],
    ],
  },
] as const;

const LIVE = [
  {
    mark: '▲',
    tone: 'up',
    lead: '+3 ofertas',
    text: 'Lavadora Samsung en Miraflores · hace 2m',
  },
  {
    mark: '▲',
    tone: 'up',
    lead: '+2 ofertas',
    text: 'Aire split en Surco · hace 5m',
  },
  { mark: '●', tone: 'dot', lead: '14 técnicos', text: 'activos en San Borja' },
  {
    mark: '▲',
    tone: 'brand',
    lead: 'Servicio cerrado',
    text: 'Refrigeradora Bosch en Lince · hace 9m',
  },
  {
    mark: '▲',
    tone: 'up',
    lead: '+4 ofertas',
    text: 'Horno Mabe en Jesús María · hace 12m',
  },
] as const;

/** Moves the spotlight of a `.spot-card` to the cursor. */
function trackSpot(event: MouseEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    '--mx',
    `${event.clientX - box.left}px`,
  );
  event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`);
}

const delay = (i: number) => ({ transitionDelay: `${i * 100}ms` });

const REVIEWS = [
  {
    who: 'Lucía Fernández',
    where: 'Miraflores',
    job: 'Reparación de lavadora Samsung',
    text: 'Subí la foto del tambor de mi lavadora que no giraba y en minutos ya tenía varias cotizaciones. Muy transparente.',
  },
  {
    who: 'Jorge Mendoza',
    where: 'Surco',
    job: 'Mantenimiento de aire acondicionado',
    text: 'Pude ver las calificaciones y la experiencia de los técnicos antes de elegir. El mantenimiento quedó de primera.',
  },
  {
    who: 'Andrea Paredes',
    where: 'San Borja',
    job: 'Reparación de refrigeradora Bosch',
    text: 'Muy práctico coordinar directo con el técnico sin intermediarios. Solucionaron el problema el mismo día.',
  },
] as const;

const CLIENT_SIGNUP = '/register?role=client';
const TECHNICIAN_SIGNUP = '/register?role=technician';

const navLink = 'text-ink no-underline transition-colors hover:text-brand';
const solidBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-brand font-semibold text-white no-underline transition-colors hover:bg-brand-strong';
const stepCard =
  'grid content-start gap-4 rounded-2xl border border-[var(--rm-cover-line)] bg-surface p-6 shadow-card';

function Stars({ size = 15 }: { size?: number }) {
  return (
    <span aria-label="5 de 5 estrellas" className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className="fill-brand text-brand"
        />
      ))}
    </span>
  );
}

/** `/`: public presentation of RepairMatch in four full-bleed bands. */
export function LandingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const signedIn = auth.status === 'authenticated';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [scene, setScene] = useState(0);
  const show = SHOWCASE[scene]!;
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  function quoteHref(cat?: string | null, q?: string) {
    if (signedIn) return roleHome(auth.user.role);
    const params = new URLSearchParams({ role: 'client' });
    if (cat) params.set('category', cat);
    if (q?.trim()) params.set('q', q.trim());
    return `/register?${params.toString()}`;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate(quoteHref(category, query));
  }

  return (
    <div ref={rootRef} className="flex min-h-screen flex-col bg-bg text-ink">
      <a className="skip-link" href="#landing-main">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-[var(--rm-nav-line)] bg-surface">
        <div className="shell grid grid-cols-[1fr_auto_1fr] items-center py-3.5">
          <Link className="brand" to="/" aria-label="RepairMatch inicio">
            <span className="brand-mark" aria-hidden="true">
              R
            </span>
            RepairMatch
          </Link>
          <nav
            aria-label="Secciones"
            className="flex gap-7 text-sm font-medium"
          >
            <a href="#como-funciona" className={navLink}>
              Cómo funciona
            </a>
            <a href="#especialidades" className={navLink}>
              Especialidades
            </a>
            <a href="#para-tecnicos" className={navLink}>
              Para técnicos
            </a>
          </nav>
          <div className="flex items-center justify-end gap-2.5">
            {signedIn ? (
              <Link
                to={roleHome(auth.user.role)}
                className={cx(solidBtn, 'min-h-10 px-5 text-sm')}
              >
                Ir a mi panel <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink no-underline hover:border-ink"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to={CLIENT_SIGNUP}
                  className={cx(solidBtn, 'min-h-10 px-5 text-sm')}
                >
                  Publicar problema
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        id="landing-main"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        {/* Band 1 — hero on stone. */}
        <section aria-labelledby="landing-title" className="bg-bg">
          <div className="shell grid grid-cols-[55fr_45fr] items-center gap-14 py-20">
            <div className="rise grid content-start justify-items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-fresh/25 bg-fresh-soft px-3.5 py-1 text-sm font-medium text-fresh-strong">
                <span
                  aria-hidden="true"
                  className="pulse-fresh size-2 rounded-full bg-fresh"
                />
                Técnicos verificados en Lima Metropolitana
              </span>
              <h1
                id="landing-title"
                className="m-0 text-[clamp(2.4rem,4.4vw,3.9rem)] leading-[1.05] font-extrabold tracking-[-0.035em]"
              >
                Repara tu equipo hoy,
                <span className="block text-brand">
                  cotiza gratis en minutos.
                </span>
              </h1>
              <p className="m-0 max-w-xl text-lg text-muted">
                Describe la falla o sube una foto. Recibe propuestas de técnicos
                cercanos con precio estimado y diagnóstico.
              </p>

              <div className="grid w-full max-w-xl gap-2">
                <form
                  role="search"
                  onSubmit={submit}
                  className="ai-glow relative rounded-2xl p-[1.5px]"
                >
                  <div className="flex items-center gap-3 rounded-[15px] bg-surface py-2.5 pr-2.5 pl-5">
                    <span
                      aria-hidden="true"
                      className="ai-icon relative grid size-6 shrink-0 place-items-center text-brand"
                    >
                      <Sparkles size={22} className="ai-icon-a absolute" />
                      <Search size={22} className="ai-icon-b absolute" />
                    </span>
                    <label className="grid flex-1 gap-0.5">
                      <span className="text-[0.95rem] font-semibold">
                        Describe la falla con tus palabras…
                      </span>
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        aria-describedby="ai-hint"
                        placeholder="ej. 'Mi lavadora hace ruido y no bota agua'"
                        className="peer min-w-0 border-0 bg-transparent p-0 text-[0.95rem] text-ink outline-none placeholder:text-muted"
                      />
                    </label>
                    <button
                      type="submit"
                      className={cx(solidBtn, 'sweep min-h-12 border-0 px-6')}
                    >
                      Cotizar ahora <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  </div>
                </form>
                <p
                  id="ai-hint"
                  className="ai-hint m-0 inline-flex items-center gap-1.5 pl-1 text-xs text-slate"
                >
                  <Sparkles
                    size={12}
                    aria-hidden="true"
                    className="text-fresh"
                  />
                  IA semántica: identifica el equipo, la falla probable y
                  técnicos compatibles cerca de ti
                </p>
              </div>

              <div
                role="group"
                aria-label="Equipos frecuentes"
                className="flex flex-wrap gap-2.5"
              >
                {CHIPS.map((chip) => {
                  const active = category === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(active ? null : chip.value)}
                      className={cx(
                        'min-h-10 rounded-full border px-4 text-sm font-medium transition-colors duration-200',
                        active
                          ? 'border-ink bg-surface-2 text-ink'
                          : 'border-line bg-surface text-ink hover:border-ink/50',
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <Check size={15} aria-hidden="true" /> Cotización gratuita
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Zap size={15} aria-hidden="true" className="text-brand" /> 1ª
                  oferta en ~14 min
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Star
                    size={15}
                    aria-hidden="true"
                    className="fill-ink text-ink"
                  />
                  <strong className="text-ink">4.9</strong> en Lima
                </span>
              </p>
            </div>

            {/* 2.5D showcase: tabs switch the case, offers float on their own planes. */}
            <div className="rise showcase-stage relative grid gap-4">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-8 rounded-full bg-[radial-gradient(circle_at_30%_40%,rgb(224_90_30/14%),transparent_60%),radial-gradient(circle_at_75%_70%,rgb(5_150_105/12%),transparent_60%)] blur-[48px]"
              />
              <div
                role="tablist"
                aria-label="Casos de ejemplo"
                className="relative flex gap-1.5 justify-self-start rounded-full bg-surface p-1 shadow-card"
              >
                {SHOWCASE.map((item, i) => (
                  <button
                    key={item.tab}
                    type="button"
                    role="tab"
                    aria-selected={scene === i}
                    onClick={() => setScene(i)}
                    className={cx(
                      'min-h-9 rounded-full border-0 px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                      scene === i
                        ? 'bg-ink text-bg'
                        : 'bg-transparent text-muted hover:text-ink',
                    )}
                  >
                    {item.tab}
                  </button>
                ))}
              </div>
              <div className="showcase-card float-shadow relative rounded-2xl border border-[var(--rm-cover-line)] bg-[image:var(--rm-cover-bg)] p-4">
                <div
                  key={show.photo}
                  className="swap-in relative aspect-[4/3.1] overflow-hidden rounded-xl"
                >
                  <Scene
                    photo={show.photo}
                    appliance={show.appliance}
                    tone={show.tone}
                    alt={show.request}
                  />
                </div>
                {/* Top-left: the request and its diagnosis. Bottom-right: the offers. They never share a corner. */}
                <div
                  key={`req-${scene}`}
                  className="swap-in group/req absolute top-8 left-8 z-30 grid max-w-[58%] justify-items-start gap-2 [transform:translateZ(40px)]"
                >
                  <div
                    tabIndex={0}
                    className="float-shadow grid cursor-default gap-2 rounded-xl border border-line bg-surface px-4 py-3 transition-colors group-hover/req:border-ink/30 focus:outline-none"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <Camera
                        size={15}
                        aria-hidden="true"
                        className="text-muted"
                      />{' '}
                      {show.request}
                    </span>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold text-fresh-strong">
                      <Check size={12} aria-hidden="true" /> 3 ofertas listas
                    </span>
                  </div>
                  <span className="pointer-events-none -translate-y-1 rounded-xl bg-[#242725] px-3 py-2 text-xs leading-snug font-medium text-white opacity-0 shadow-card transition-[opacity,transform] duration-300 group-hover/req:translate-y-0 group-hover/req:opacity-100 group-focus-within/req:translate-y-0 group-focus-within/req:opacity-100">
                    Diagnóstico estimado: {show.diagnosis}
                  </span>
                </div>
                <ul
                  key={`offers-${scene}`}
                  className="swap-in absolute right-8 bottom-8 z-20 m-0 grid list-none gap-2 p-0 [transform:translateZ(70px)]"
                >
                  {show.offers.map(([ini, name, rate, note, price], i) => (
                    <li
                      key={name + note}
                      className={cx(
                        'float-shadow flex items-center gap-3 rounded-xl border bg-surface px-3.5 py-2.5',
                        i === 0 ? 'border-fresh/50' : 'mr-6 border-line',
                      )}
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-cobalt-soft text-xs font-bold text-cobalt">
                        {ini}
                      </span>
                      <span className="grid text-sm">
                        <span className="font-semibold">
                          {name} ·{' '}
                          <Star
                            size={12}
                            aria-hidden="true"
                            className="inline fill-brand text-brand"
                          />{' '}
                          {rate}
                        </span>
                        <span className="text-muted">
                          {note} · S/ {price}
                        </span>
                      </span>
                      {i === 0 ? (
                        <span className="ml-1 rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-semibold text-fresh-strong">
                          Verificado
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Live market ticker between stone and white. */}
        <div className="ticker relative flex items-center overflow-hidden border-y border-[#dcd5c9] bg-[#f5f2eb] dark:border-line dark:bg-surface-2">
          <span className="relative z-10 ml-4 inline-flex shrink-0 items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-bold tracking-wide shadow-card">
            <span
              aria-hidden="true"
              className="pulse-fresh size-2 rounded-full bg-fresh"
            />
            EN VIVO LIMA
          </span>
          <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
            <ul className="ticker-track m-0 flex w-max list-none gap-10 py-3 pl-10 text-sm">
              {[...LIVE, ...LIVE].map((item, i) => (
                <li
                  key={i}
                  aria-hidden={i >= LIVE.length || undefined}
                  className="inline-flex items-center gap-2 whitespace-nowrap text-muted"
                >
                  <span
                    className={cx(
                      'font-bold',
                      item.tone === 'up'
                        ? 'text-fresh-strong'
                        : item.tone === 'brand'
                          ? 'text-brand'
                          : 'text-fresh',
                    )}
                  >
                    {item.mark}
                  </span>
                  <strong className="text-ink">{item.lead}</strong> ·{' '}
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Band 2 — specialties on white. */}
        <section
          id="especialidades"
          aria-labelledby="specialties-title"
          className="scroll-mt-16 border-y border-[var(--rm-nav-line)] bg-surface"
        >
          <div className="shell grid gap-9 py-20">
            <header className="reveal grid gap-1.5 text-center">
              <h2
                id="specialties-title"
                className="m-0 text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em]"
              >
                Especialidades más solicitadas en Lima
              </h2>
              <p className="m-0 text-lg text-muted">
                Tarifas referenciales claras y técnicos verificados en tu
                distrito
              </p>
            </header>
            <ul className="m-0 grid list-none grid-cols-3 grid-rows-[15rem_15rem] gap-5 p-0">
              {SPECIALTIES.map((item, i) => (
                <li
                  key={item.value}
                  style={delay(i)}
                  onMouseMove={trackSpot}
                  className={cx(
                    'reveal spot-card group relative overflow-hidden rounded-card shadow-card',
                    i === 0 && 'row-span-2 ring-2 ring-brand/30',
                    i === 3 && 'col-start-3 row-span-2 row-start-1',
                  )}
                >
                  <Scene
                    photo={item.value}
                    appliance={item.icon}
                    alt={item.title}
                    tone={i === 1 ? 'cool' : i === 2 ? 'sage' : 'warm'}
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#1b1d1c]/80 via-[#1b1d1c]/15 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                    <div className="grid gap-0.5">
                      <h3
                        className={cx(
                          'm-0 font-bold text-white',
                          i === 0 ? 'text-2xl' : 'text-lg',
                        )}
                      >
                        {i === 0 ? 'Lavadoras y secadoras' : item.title}
                      </h3>
                      <p className="m-0 text-sm text-white/85">
                        Desde S/ {item.from} · {item.near} técnicos activos
                      </p>
                    </div>
                    <Link
                      to={quoteHref(item.value)}
                      className="relative z-10 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink no-underline transition-colors hover:bg-brand hover:text-white"
                    >
                      Cotizar <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Band 3 — how it works, with real UI snippets. */}
        <section
          id="como-funciona"
          aria-labelledby="how-title"
          className="scroll-mt-16 bg-[radial-gradient(circle_at_20%_10%,rgb(16_185_129/14%),transparent_55%),linear-gradient(135deg,#bce0ce_0%,#d8efe3_48%,#f3e8d8_100%)] bg-[length:200%_200%] grad-drift dark:bg-none dark:bg-surface-2"
        >
          <div className="shell grid gap-9 py-20">
            <header className="reveal grid gap-1.5 text-center">
              <h2
                id="how-title"
                className="m-0 text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em]"
              >
                Cómo funciona RepairMatch
              </h2>
              <p className="m-0 text-lg text-slate">
                Describe tu caso, compara propuestas reales de técnicos y
                soluciona tu problema el mismo día.
              </p>
            </header>
            <ol className="m-0 grid list-none grid-cols-3 gap-5 p-0">
              <li
                className={cx('reveal spot-card spot-tint', stepCard)}
                style={delay(0)}
                onMouseMove={trackSpot}
              >
                <h3 className="m-0 text-lg font-bold">01 · Publica la falla</h3>
                <div aria-hidden="true" className="grid gap-3">
                  <div className="flex gap-2.5">
                    <span className="grid size-16 place-items-center rounded-xl bg-surface-2 text-brand">
                      <ApplianceIcon
                        name="Washing Machine"
                        size={30}
                        strokeWidth={1.4}
                      />
                    </span>
                    <span className="grid size-16 place-items-center rounded-xl border-2 border-dashed border-line text-muted">
                      <Plus size={20} />
                    </span>
                  </div>
                  <p className="m-0 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm">
                    <strong>Lavadora Samsung</strong> · No bota el agua
                  </p>
                </div>
              </li>
              <li
                className={cx('reveal spot-card spot-tint', stepCard)}
                style={delay(1)}
                onMouseMove={trackSpot}
              >
                <h3 className="m-0 text-lg font-bold">
                  02 · Compara ofertas reales
                </h3>
                <ul
                  aria-hidden="true"
                  className="m-0 grid list-none gap-2.5 p-0"
                >
                  {[
                    [
                      'CQ',
                      'S/ 45',
                      'Carlos Q.',
                      '5.0',
                      'Revisión y cambio de bomba',
                    ],
                    ['LM', 'S/ 55', 'Luis M.', '4.9', 'Reparación del desagüe'],
                  ].map(([ini, price, name, rate, note], i) => (
                    <li
                      key={name}
                      className={cx(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                        i === 0
                          ? '-translate-y-0.5 border-fresh/60 bg-fresh-soft shadow-[0_0_0_4px_rgb(5_150_105/10%),0_12px_24px_-12px_rgb(5_150_105/45%)]'
                          : 'border-line',
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cobalt-soft text-xs font-bold text-cobalt">
                        {ini}
                      </span>
                      <span className="grid text-sm">
                        <span className="font-semibold">
                          {price} · {name}{' '}
                          <Star
                            size={12}
                            className="inline fill-brand text-brand"
                          />{' '}
                          {rate}
                        </span>
                        <span className="text-xs text-muted">{note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
              <li
                className={cx('reveal spot-card spot-tint', stepCard)}
                style={delay(2)}
                onMouseMove={trackSpot}
              >
                <h3 className="m-0 text-lg font-bold">
                  03 · Elige y haz seguimiento
                </h3>
                <div aria-hidden="true" className="grid gap-4">
                  <ol className="m-0 grid list-none grid-cols-3 p-0 text-xs">
                    {['Publicada', 'Ofertas', 'Técnico en camino'].map(
                      (label, i) => (
                        <li key={label} className="grid gap-2">
                          <span className="flex items-center">
                            <span
                              className={cx(
                                'size-3 shrink-0 rounded-full',
                                i < 2
                                  ? 'bg-brand'
                                  : 'pulse-fresh bg-fresh ring-4 ring-fresh-soft',
                              )}
                            />
                            {i < 2 ? (
                              <span
                                className={cx(
                                  'h-0.5 flex-1',
                                  i === 0 ? 'bg-brand' : 'bg-fresh',
                                )}
                              />
                            ) : null}
                          </span>
                          <span
                            className={cx(
                              'font-medium',
                              i === 2 && 'text-fresh-strong',
                            )}
                          >
                            {label}
                          </span>
                        </li>
                      ),
                    )}
                  </ol>
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm">
                    <MapPin size={18} className="text-brand" />
                    <span>
                      <strong>Carlos Q.</strong> llega hoy · 3:30 p. m.
                    </span>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Band 4a — reviews on stone. */}
        <section
          aria-labelledby="reviews-title"
          className="bg-[linear-gradient(125deg,#f5dfc9_0%,#efe6da_52%,#d4e7dd_100%)] bg-[length:200%_200%] grad-drift [animation-delay:-9s] dark:bg-none dark:bg-bg"
        >
          <div className="shell grid gap-9 py-20">
            <h2
              id="reviews-title"
              className="reveal m-0 text-center text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em]"
            >
              Lo que dicen nuestros usuarios en Lima
            </h2>
            <ul className="m-0 grid list-none grid-cols-3 gap-5 p-0">
              {REVIEWS.map((r, i) => (
                <li
                  key={r.who}
                  style={delay(i)}
                  onMouseMove={trackSpot}
                  className="reveal spot-card spot-tint review-card grid content-start gap-3 rounded-card border border-line bg-surface p-6 shadow-card"
                >
                  <Stars />
                  <p className="m-0 text-sm font-semibold">
                    {r.who} · {r.where} ·{' '}
                    <span className="font-normal text-muted">{r.job}</span>
                  </p>
                  <blockquote className="m-0 text-[0.95rem] leading-relaxed">
                    {r.text}
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Band 4b — technician pitch on olive charcoal. */}
        <section
          id="para-tecnicos"
          aria-labelledby="tech-title"
          className="scroll-mt-16 bg-[#242725] text-white"
        >
          <div className="shell grid grid-cols-[1.3fr_1fr] items-center gap-12 py-20">
            <div className="reveal grid justify-items-start gap-4">
              <span className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">
                ¿Eres técnico?
              </span>
              <h2
                id="tech-title"
                className="m-0 text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-white"
              >
                ¿Eres técnico especialista en Lima?
              </h2>
              <p className="m-0 max-w-lg text-lg text-white/75">
                Visualiza solicitudes con foto real del daño en tu distrito,
                cotiza directo y gestiona tus visitas en un solo panel.
              </p>
              <Link
                to={TECHNICIAN_SIGNUP}
                className={cx(solidBtn, 'mt-2 min-h-12 px-6')}
              >
                Registrarme como técnico{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div
              aria-hidden="true"
              className="reveal relative justify-self-center"
            >
              <span className="absolute -inset-10 rounded-full bg-[radial-gradient(circle_at_35%_40%,rgb(5_150_105/45%),transparent_60%),radial-gradient(circle_at_70%_65%,rgb(201_74_20/40%),transparent_60%)] blur-[56px]" />
              <div className="relative rounded-2xl bg-surface p-6 text-ink shadow-[0_24px_48px_-20px_rgb(0_0_0/60%)]">
                <p className="m-0 text-center font-display font-bold">
                  Cerca de Miraflores
                </p>
                <p className="m-0 mt-1 text-center">
                  <span className="rounded-full bg-surface-2 px-3 py-0.5 text-xs text-muted">
                    9 solicitudes en tu radio
                  </span>
                </p>
                <svg viewBox="0 0 200 200" className="mt-4 size-52">
                  {[90, 62, 34].map((r, i) => (
                    <circle
                      key={r}
                      cx="100"
                      cy="100"
                      r={r}
                      fill="var(--rm-fresh)"
                      fillOpacity={0.05 + i * 0.05}
                      stroke="var(--rm-fresh)"
                      strokeOpacity=".3"
                    />
                  ))}
                  {[
                    [70, 40, 'var(--rm-fresh)'],
                    [140, 52, 'var(--rm-fresh)'],
                    [52, 108, 'var(--rm-brand)'],
                    [128, 96, 'var(--rm-fresh)'],
                    [104, 118, 'var(--rm-brand)'],
                    [150, 150, 'var(--rm-brand)'],
                    [80, 150, 'var(--rm-fresh)'],
                  ].map(([x, y, c]) => (
                    <circle
                      key={`${x}-${y}`}
                      cx={x}
                      cy={y}
                      r="6"
                      fill={String(c)}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  ))}
                  <circle cx="100" cy="100" r="5" fill="var(--rm-ink)" />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1b1d1c]">
        <p className="shell m-0 py-5 text-center text-sm text-white/70">
          <strong className="text-white">RepairMatch</strong> · Reparaciones
          conectadas con técnicos cercanos en Lima
        </p>
      </footer>
    </div>
  );
}
