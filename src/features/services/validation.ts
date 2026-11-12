import type { CreateReview } from '../../shared/api/types';

export const REVIEW_MAX_COMMENT = 2000;

export interface ReviewFormValues {
  rating: number;
  comment: string;
}

export type ReviewFormErrors = Partial<Record<'rating' | 'comment', string>>;

export function validateReview(values: ReviewFormValues): {
  errors: ReviewFormErrors;
  data?: CreateReview;
} {
  const errors: ReviewFormErrors = {};

  if (
    !Number.isInteger(values.rating) ||
    values.rating < 1 ||
    values.rating > 5
  ) {
    errors.rating = 'Select a rating from 1 to 5 stars.';
  }

  const trimmed = values.comment.trim();
  if (!trimmed) {
    errors.comment = 'Write a short comment about the service.';
  } else if (trimmed.length > REVIEW_MAX_COMMENT) {
    errors.comment = `Comment must be at most ${REVIEW_MAX_COMMENT} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    data: {
      rating: values.rating,
      comment: trimmed,
    },
  };
}
