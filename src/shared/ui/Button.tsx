import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles';
import { Spinner } from './Spinner';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon shown before the label (a lucide icon element). */
  icon?: ReactNode;
  /** Shows a spinner, disables the button and sets `aria-busy`. */
  loading?: boolean;
}

/** The app's button. `type` defaults to "button" so it never submits by accident. */
export function Button({
  variant,
  size,
  icon,
  loading = false,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

/** A router link that looks like a button (navigation, not an action). */
export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={buttonClasses(variant, size, className as string | undefined)}
    >
      {icon}
      {children}
    </Link>
  );
}
