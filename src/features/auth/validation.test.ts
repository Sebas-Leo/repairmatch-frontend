import { describe, expect, it } from 'vitest';
import { isRole, validateLogin, validateRegister } from './validation';

const valid = {
  name: 'Test Client',
  email: 'client@example.test',
  password: 'Test-pass-1',
  role: 'CLIENT' as const,
};

describe('login validation', () => {
  it('accepts an email and any non-empty password', () => {
    expect(validateLogin({ email: 'a@b.c', password: 'x' })).toEqual({});
  });

  it('requires both fields', () => {
    expect(validateLogin({ email: '  ', password: '' })).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
  });

  it.each(['plain', 'two@@signs.test', 'with space@example.test', '@x.test'])(
    'rejects the malformed email %j',
    (email) => {
      expect(validateLogin({ email, password: 'x' }).email).toBe(
        'Enter a valid email address.',
      );
    },
  );
});

describe('register validation', () => {
  it('accepts valid values', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('requires every field', () => {
    expect(
      validateRegister({ name: ' ', email: '', password: '', role: '' }),
    ).toEqual({
      name: 'Enter your name.',
      email: 'Enter your email address.',
      password: 'Enter a password.',
      role: 'Choose an account type.',
    });
  });

  it('limits name and email length like the backend', () => {
    expect(validateRegister({ ...valid, name: 'n'.repeat(100) }).name).toBe(
      undefined,
    );
    expect(validateRegister({ ...valid, name: 'n'.repeat(101) }).name).toMatch(
      /at most 100/,
    );
    const longEmail = `${'a'.repeat(250)}@x.co`;
    expect(validateRegister({ ...valid, email: longEmail }).email).toMatch(
      /at most 254/,
    );
  });

  it.each([
    ['too short', 'Aa1!aaa'],
    ['too long', `Aa1!${'a'.repeat(69)}`],
  ])('rejects a password that is %s', (_why, password) => {
    expect(validateRegister({ ...valid, password }).password).toMatch(
      /8 to 72 characters/,
    );
  });

  it('accepts the 8 and 72 character boundaries', () => {
    expect(validateRegister({ ...valid, password: 'Aa1!aaaa' })).toEqual({});
    expect(
      validateRegister({ ...valid, password: `Aa1!${'a'.repeat(68)}` }),
    ).toEqual({});
  });

  it('counts UTF-8 bytes because the backend rejects more than 72', () => {
    // 39 characters, but 4 ASCII + 35 two-byte letters = 74 bytes.
    const password = `Aa1!${'é'.repeat(35)}`;
    expect(password.length).toBe(39);
    expect(validateRegister({ ...valid, password }).password).toMatch(
      /72 bytes/,
    );
  });

  it.each([
    ['test-pass-1', 'no uppercase'],
    ['TEST-PASS-1', 'no lowercase'],
    ['Test-pass-x', 'no digit'],
    ['TestPass123', 'no symbol'],
    ['Test pass 1', 'only whitespace as a symbol'],
  ])('requires every character class: %s (%s)', (password) => {
    expect(validateRegister({ ...valid, password }).password).toMatch(
      /uppercase letter, a lowercase letter, a number and a symbol/,
    );
  });

  it('counts a non-breaking space as a symbol (the backend whitespace class is ASCII-only)', () => {
    expect(
      validateRegister({ ...valid, password: 'TestPass1 ' }).password,
    ).toBeUndefined();
  });

  it('recognises the allowed roles', () => {
    expect(isRole('CLIENT')).toBe(true);
    expect(isRole('TECHNICIAN')).toBe(true);
    expect(isRole('ADMIN')).toBe(false);
    expect(isRole('')).toBe(false);
  });
});
