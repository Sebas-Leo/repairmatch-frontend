import { Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { createReview, getServiceReview } from './api';
import { describeApiError } from '../../shared/api/errorMessages';
import { ApiError } from '../../shared/api/http';
import type {
  CreateReview,
  Review,
  Role,
  ServiceStatus,
} from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ErrorState } from '../../shared/ui/ErrorState';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { TextAreaField } from '../../shared/ui/TextAreaField';
import {
  REVIEW_MAX_COMMENT,
  validateReview,
  type ReviewFormErrors,
} from './validation';

function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Calificación: ${rating} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          aria-hidden="true"
          className={
            star <= rating ? 'fill-sun text-sun' : 'text-muted opacity-40'
          }
        />
      ))}
      <span className="ml-1 text-sm font-semibold">{rating}/5</span>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="grid gap-2.5 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StarRatingDisplay rating={review.rating} />
        <span className="text-xs text-muted">
          {formatDateTime(review.createdAt)}
        </span>
      </div>
      <p className="m-0 whitespace-pre-line text-sm">{review.comment}</p>
    </div>
  );
}

export function ServiceReviewSection({
  serviceId,
  status,
  role,
}: {
  serviceId: number;
  status: ServiceStatus;
  role: Role;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReview, setCreatedReview] = useState<Review | null>(null);

  const isCompleted = status === 'COMPLETADO';

  const reviewQuery = useApiQuery(
    ['service-review', serviceId],
    async (signal) => {
      try {
        return await getServiceReview(serviceId, { signal });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    { enabled: isCompleted, keepPreviousData: false },
  );

  const submit = useSubmitGuard(async (payload: CreateReview) => {
    try {
      const saved = await createReview(serviceId, payload);
      setCreatedReview(saved);
      toast.success('¡Gracias! Tu reseña ha sido publicada.');
      reviewQuery.reload();
    } catch (err) {
      const message = describeApiError(err).message;
      setSubmitError(message);
      toast.error(message);
    }
  });

  if (!isCompleted) {
    return (
      <Card className="grid gap-2">
        <h2 className="m-0 text-lg">Reseña del cliente</h2>
        <p className="m-0 text-sm text-muted">
          La reseña estará disponible una vez que el servicio se marque como
          completado.
        </p>
      </Card>
    );
  }

  const review = createdReview ?? reviewQuery.data ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const validated = validateReview({ rating, comment });
    setErrors(validated.errors);
    if (!validated.data) return;

    await submit.run(validated.data);
  }

  return (
    <Card className="grid gap-3">
      <h2 className="m-0 text-lg">Reseña del cliente</h2>

      {reviewQuery.status === 'error' && !review ? (
        <ErrorState error={reviewQuery.error} onRetry={reviewQuery.reload} />
      ) : !review && reviewQuery.status === 'loading' ? (
        <ListSkeleton rows={1} label="Cargando reseña" />
      ) : review ? (
        <ReviewCard review={review} />
      ) : role === 'CLIENT' ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="grid gap-3"
        >
          <p className="m-0 text-sm text-muted">
            ¿Cómo fue la reparación? Puedes publicar una reseña para este
            servicio.
          </p>

          {submitError ? (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {submitError}
            </div>
          ) : null}

          <fieldset className="m-0 grid gap-1.5 border-0 p-0">
            <legend className="text-sm font-medium">Calificación</legend>
            <div
              className="flex flex-wrap gap-1.5"
              role="radiogroup"
              aria-label="Calificación"
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = rating === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                    onClick={() => {
                      setRating(value);
                      setErrors((prev) => {
                        const rest = { ...prev };
                        delete rest.rating;
                        return rest;
                      });
                    }}
                    className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                      selected
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-line bg-surface text-muted hover:text-ink'
                    }`}
                  >
                    <Star
                      size={16}
                      aria-hidden="true"
                      className={selected ? 'fill-current' : ''}
                    />
                    {value}
                  </button>
                );
              })}
            </div>
            {errors.rating ? (
              <p className="field-error">{errors.rating}</p>
            ) : null}
          </fieldset>

          <TextAreaField
            id="review-comment"
            label="Comentario"
            placeholder="Cuéntanos qué tan puntual, claro y efectivo fue el técnico."
            maxLength={REVIEW_MAX_COMMENT}
            value={comment}
            error={errors.comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (errors.comment) {
                setErrors((prev) => {
                  const rest = { ...prev };
                  delete rest.comment;
                  return rest;
                });
              }
            }}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={submit.isSubmitting}>
              {submit.isSubmitting ? 'Publicando reseña…' : 'Publicar reseña'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="m-0 text-sm text-muted">
          El cliente aún no ha dejado una reseña para este servicio.
        </p>
      )}
    </Card>
  );
}
