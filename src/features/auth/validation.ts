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
  if (!value) return 'Ingresa tu correo electrónico.';
  if (value.length > EMAIL_MAX) {
    return `El correo debe tener como máximo ${EMAIL_MAX} caracteres.`;
  }
  if (!EMAIL_PATTERN.test(value))
    return 'Ingresa un correo electrónico válido.';
  return undefined;
}

function passwordRulesError(password: string): string | undefined {
  if (!password) return 'Ingresa una contraseña.';
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `La contraseña debe tener entre ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`;
  }
  // bcrypt only reads 72 bytes, so the backend rejects longer UTF-8 encodings.
  if (utf8Length(password) > PASSWORD_MAX) {
    return `La contraseña debe tener como máximo ${PASSWORD_MAX} bytes; algunos caracteres ocupan más de un byte.`;
  }
  if (!(
    HAS_LOWER.test(password) &&
    HAS_UPPER.test(password) &&
    HAS_DIGIT.test(password) &&
    HAS_SYMBOL.test(password)
  )) {
    return 'La contraseña debe incluir una mayúscula, una minúscula, un número y un símbolo.';
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
  if (!values.password) errors.password = 'Ingresa tu contraseña.';
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
  if (!name) errors.name = 'Ingresa tu nombre.';
  else if (values.name.length > NAME_MAX) {
    errors.name = `El nombre debe tener como máximo ${NAME_MAX} caracteres.`;
  }
  const email = emailError(values.email);
  if (email) errors.email = email;
  const password = passwordRulesError(values.password);
  if (password) errors.password = password;
  if (!values.role) errors.role = 'Selecciona un tipo de cuenta.';
  return errors;
}
