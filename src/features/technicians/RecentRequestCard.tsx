import {
  CalendarClock,
  Clock,
  Expand,
  MapPin,
  MessageSquareText,
  Send,
  Stethoscope,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { cx } from '../../shared/ui/cx';
import { applianceLabel } from '../requests/applianceLabel';
import { CoverPhoto } from '../requests/CoverPhoto';
import type { RecommendedRequest } from './api';
import { InlineOfferForm } from './InlineOfferForm';
import { timeAgo } from './timeAgo';

const FRESH_MS = 3 * 60 * 60 * 1000;

function isFresh(item: RecommendedRequest): boolean {
  return Date.now() - new Date(item.createdAt).getTime() < FRESH_MS;
}

/**
 * A client who recently published a repair. At rest the card is compact
 * (photo, one line of facts, title, action). On hover or focus a details
 * panel unfolds *over* the row below, absolutely positioned, so the grid
 * never changes height and nothing jumps. The offer form lives in that
 * panel and keeps it open while the technician types.
 */
export function RecentRequestCard({
  item,
  highlighted = false,
  onSent,
}: {
  item: RecommendedRequest;
  highlighted?: boolean;
  onSent: () => void;
}) {
  const { request } = item;
  const product = [request.brand, request.model].filter(Boolean).join(' ');
  const title = product || applianceLabel(request.applianceTypeName);
  const [quoting, setQuoting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fresh = isFresh(item);

  return (
    <article
      id={`request-${request.requestId}`}
      data-open={quoting || undefined}
      className={cx(
        'feed-card group relative rounded-card border bg-surface shadow-card',
        highlighted ? 'border-brand' : 'border-line',
      )}
    >
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="relative block w-full overflow-hidden rounded-t-card border-0 bg-transparent p-0 text-left"
        aria-label={`Ampliar foto de ${applianceLabel(request.applianceTypeName)}`}
      >
        <CoverPhoto
          applianceName={request.applianceTypeName}
          className="aspect-[16/10] rounded-none"
        >
          <span className="absolute top-3 left-3 rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
            {applianceLabel(request.applianceTypeName)}
          </span>
          {fresh || item.proposalCount === 0 ? (
            <span className="absolute top-3 right-3 rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold text-fresh">
              {fresh ? 'Nuevo' : 'Sin ofertas aún'}
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-3 grid size-8 place-items-center rounded-full bg-surface/90 text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <Expand size={15} />
          </span>
        </CoverPhoto>
      </button>

      <div className="grid gap-2.5 px-5 pt-4 pb-5">
        <p className="m-0 flex items-center gap-x-3 truncate text-sm text-slate">
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <MapPin size={14} aria-hidden="true" className="text-cobalt" />
            {request.distanceKm.toFixed(1)} km
          </span>
          <span aria-hidden="true" className="text-line">
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden="true" />
            {timeAgo(item.createdAt)}
          </span>
          <span aria-hidden="true" className="text-line">
            ·
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquareText size={14} aria-hidden="true" />
            {item.proposalCount === 0
              ? 'Sin ofertas'
              : item.proposalCount === 1
                ? '1 oferta'
                : `${item.proposalCount} ofertas`}
          </span>
        </p>
        <h3 className="m-0 truncate text-lg" title={title}>
          {title}
        </h3>
        <button
          type="button"
          onClick={() => setQuoting(true)}
          className="offer-cta inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
        >
          <Send size={16} aria-hidden="true" />
          Enviar oferta
        </button>
      </div>

      {/* Unfolds over the next row: absolute, so the grid never moves. */}
      <div
        className={cx(
          'card-details absolute inset-x-[-1px] top-[calc(100%-1rem)] z-30 grid gap-3 rounded-b-card border border-t-0 bg-surface px-5 pt-5 pb-5',
          highlighted ? 'border-brand' : 'border-line',
        )}
      >
        <p className="m-0 text-sm text-muted">{request.description}</p>
        <dl className="m-0 grid gap-1.5 text-sm">
          <div className="flex items-start gap-2">
            <dt className="inline-flex shrink-0 items-center gap-1 font-semibold text-slate">
              <Stethoscope
                size={14}
                aria-hidden="true"
                className="text-cobalt"
              />
              Síntoma
            </dt>
            <dd className="m-0 text-muted">
              {item.symptom ?? 'No identificado; revisa la descripción.'}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="inline-flex shrink-0 items-center gap-1 font-semibold text-slate">
              <CalendarClock
                size={14}
                aria-hidden="true"
                className="text-cobalt"
              />
              Disponibilidad
            </dt>
            <dd className="m-0 text-muted">
              El cliente aún no indicó horario; propón el tuyo.
            </dd>
          </div>
        </dl>
        {item.reasons.length > 0 ? (
          <ul
            className="m-0 flex list-none flex-wrap gap-1.5 p-0"
            aria-label="Por qué aparece aquí"
          >
            {item.reasons
              .filter((reason) => reason.code !== 'NEAR')
              .slice(0, 2)
              .map((reason) => (
                <li
                  key={reason.code}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-ink"
                >
                  {reason.label}
                </li>
              ))}
          </ul>
        ) : null}
        {quoting ? (
          <InlineOfferForm
            requestId={request.requestId}
            onCancel={() => setQuoting(false)}
            onSent={onSent}
          />
        ) : null}
      </div>

      <dialog
        ref={dialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-auto w-[min(56rem,92vw)] overflow-hidden rounded-card border border-line bg-surface p-0 backdrop:bg-ink/60 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          <CoverPhoto
            applianceName={request.applianceTypeName}
            className="aspect-[16/10] rounded-none"
          />
          <form method="dialog">
            <button
              type="submit"
              className="absolute top-3 right-3 inline-flex min-h-10 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
            >
              <X size={16} aria-hidden="true" />
              Cerrar
            </button>
          </form>
        </div>
        <p className="m-0 p-4 text-sm text-muted">
          {title} · {request.description}
        </p>
      </dialog>
    </article>
  );
}
