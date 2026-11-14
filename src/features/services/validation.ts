import type { CreateReview } from '../../shared/api/types';

export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_MIN_COMMENT = 5;
export const REVIEW_MAX_COMMENT = 500;

export type ReviewFormErrors = Partial<Record<'rating' | 'comment', string>>;

export function validateReview(raw: { rating: number; comment: string }): {
  data?: CreateReview;
  errors: ReviewFormErrors;
} {
  const errors: ReviewFormErrors = {};

  if (
    !Number.isInteger(raw.rating) ||
    raw.rating < REVIEW_MIN_RATING ||
    raw.rating > REVIEW_MAX_RATING
  ) {
    errors.rating = 'Elige una calificación entre 1 y 5 estrellas.';
  }

  const trimmedComment = raw.comment.trim();
  if (!trimmedComment) {
    errors.comment = 'Escribe un breve comentario sobre la atención recibida.';
  } else if (trimmedComment.length < REVIEW_MIN_COMMENT) {
    errors.comment = `El comentario debe tener al menos ${REVIEW_MIN_COMMENT} caracteres.`;
  } else if (trimmedComment.length > REVIEW_MAX_COMMENT) {
    errors.comment = `El comentario no puede superar los ${REVIEW_MAX_COMMENT} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      rating: raw.rating,
      comment: trimmedComment,
    },
    errors,
  };
}
