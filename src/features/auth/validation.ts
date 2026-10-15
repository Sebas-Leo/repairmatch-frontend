import { ROLES, type Role } from '../../shared/api/types';

/**
 * Client-side checks that mirror the backend constraints (RegisterRequestDto
 * and LoginRequestDto) so people get quick feedback. They are a convenience
 * only: the backend stays authoritative and its messages are shown when it
 * disagrees.
 */

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

// Deliberately lenient (like the backend's @Email): one "@", no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
// Same classes as the backend: lowercase, uppercase, decimal digit, and a
// symbol = neither letter, number nor ASCII whitespace (Java's \s).
const HAS_LOWER = /\p{Ll}/u;
const HAS_UPPER = /\p{Lu}/u;
const HAS_DIGIT = /\p{Nd}/u;
const HAS_SYMBOL = /[^\p{L}\p{N} \t\n\v\f\r]/u;

const utf8Length = (text: string) => new TextEncoder().encode(text).length;

function emailError(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (value.length > EMAIL_MAX) {
    return `Email must be at most ${EMAIL_MAX} characters.`;
  }
  if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  return undefined;
}

function passwordRulesError(password: string): string | undefined {
  if (!password) return 'Enter a password.';
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  }
  // bcrypt only reads 72 bytes, so the backend rejects longer UTF-8 encodings.
  if (utf8Length(password) > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} bytes; some characters count as more than one.`;
  }
  if (!(
    HAS_LOWER.test(password) &&
    HAS_UPPER.test(password) &&
    HAS_DIGIT.test(password) &&
    HAS_SYMBOL.test(password)
  )) {
    return 'Password needs an uppercase letter, a lowercase letter, a number and a symbol.';
  }
  return undefined;
}

export interface LoginValues {
  email: string;
  password: string;
}

export function validateLogin(
  values: LoginValues,
): FieldErrors<keyof LoginValues> {
  const errors: FieldErrors<keyof LoginValues> = {};
  const email = emailError(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  /** Empty until the person chooses. */
  role: Role | '';
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function validateRegister(
  values: RegisterValues,
): FieldErrors<keyof RegisterValues> {
  const errors: FieldErrors<keyof RegisterValues> = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Enter your name.';
  else if (values.name.length > NAME_MAX) {
    errors.name = `Name must be at most ${NAME_MAX} characters.`;
  }
  const email = emailError(values.email);
  if (email) errors.email = email;
  const password = passwordRulesError(values.password);
  if (password) errors.password = password;
  if (!values.role) errors.role = 'Choose an account type.';
  return errors;
}
