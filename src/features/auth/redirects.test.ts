import { describe, expect, it } from 'vitest';
import { readReturnPath, resolvePostLoginTarget, roleHome } from './redirects';

describe('role homes', () => {
  it('maps each role to its area', () => {
    expect(roleHome('CLIENT')).toBe('/client');
    expect(roleHome('TECHNICIAN')).toBe('/technician');
  });
});

describe('readReturnPath', () => {
  it('accepts in-app paths with query and hash', () => {
    expect(readReturnPath({ from: '/client/requests?x=1#top' })).toBe(
      '/client/requests?x=1#top',
    );
  });

  it.each([
    null,
    undefined,
    'text',
    {},
    { from: 42 },
    { from: 'https://evil.example/x' },
    { from: '//evil.example/x' },
    { from: 'client' },
    { from: '/ok\\..\\evil' },
    { from: '/ok\nnewline' },
  ])('rejects %j', (state) => {
    expect(readReturnPath(state)).toBeNull();
  });
});

describe('resolvePostLoginTarget', () => {
  it('goes to the role home without a preserved location', () => {
    expect(resolvePostLoginTarget(null, 'CLIENT')).toBe('/client');
    expect(resolvePostLoginTarget({}, 'TECHNICIAN')).toBe('/technician');
  });

  it('returns to the preserved location of the same role area', () => {
    expect(resolvePostLoginTarget({ from: '/client' }, 'CLIENT')).toBe(
      '/client',
    );
    expect(
      resolvePostLoginTarget({ from: '/technician/x?y=1' }, 'TECHNICIAN'),
    ).toBe('/technician/x?y=1');
  });

  it('does not send a role into the other role area', () => {
    expect(resolvePostLoginTarget({ from: '/client/x' }, 'TECHNICIAN')).toBe(
      '/technician',
    );
    expect(resolvePostLoginTarget({ from: '/technician' }, 'CLIENT')).toBe(
      '/client',
    );
  });

  it('does not treat a similarly named path as an area', () => {
    expect(resolvePostLoginTarget({ from: '/clients' }, 'TECHNICIAN')).toBe(
      '/clients',
    );
  });

  it.each(['/', '/login', '/register?x=1', '/unauthorized'])(
    'never returns to %s',
    (from) => {
      expect(resolvePostLoginTarget({ from }, 'CLIENT')).toBe('/client');
    },
  );

  it('ignores unsafe locations', () => {
    expect(resolvePostLoginTarget({ from: '//evil.example' }, 'CLIENT')).toBe(
      '/client',
    );
  });
});
