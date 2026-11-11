import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Renders the card as an <article> (an item of a list) instead of a <div>. */
  as?: 'div' | 'article' | 'section';
  children: ReactNode;
}

/** A bordered surface that groups related content. */
export function Card({
  as: Tag = 'div',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      {...props}
      className={cx(
        'rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
