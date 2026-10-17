import { describe, expect, it, vi } from 'vitest';
import {
  createFakeBackend,
  errorResponse,
  type Routes,
} from '../../test/fakeApi';
import { createAxiosClient } from './axiosClient';
import { describeApiError, type ApiErrorKind } from './errorMessages';
import { apiErrorFromResponse, NetworkError } from './http';

/** An `ApiError` as the client builds it from a response with this JSON body. */
function failure(status: number, body?: object) {
  return apiErrorFromResponse(
    status,
    body === undefined ? undefined : JSON.stringify(body),
  );
}

describe('describeApiError by HTTP status', () => {
  // A backend message is only used for the kinds it is written for (see below).
  it.each<[number, ApiErrorKind, boolean]>([
    [400, 'validation', false],
    [401, 'unauthorized', false],
    [403, 'forbidden', false],
    [404, 'not-found', false],
    [408, 'timeout', true],
    [409, 'conflict', false],
    [422, 'validation', false],
    [429, 'rate-limited', true],
    [500, 'server', true],
    [502, 'server', true],
    [503, 'server', true],
    [504, 'server', true],
    [418, 'unknown', false],
    [405, 'unknown', false],
  ])('maps %i to %s (retryable: %s)', (status, kind, retryable) => {
    const description = describeApiError(failure(status));

    expect(description.kind).toBe(kind);
    expect(description.retryable).toBe(retryable);
    expect(description.title).not.toBe('');
    expect(description.message).not.toBe('');
  });

  it.each([400, 401, 403, 404, 408, 409, 422, 429, 500, 503, 418])(
    'never shows the generic "Request failed (%i)" line',
    (status) => {
      expect(describeApiError(failure(status)).message).not.toMatch(
        /Request failed/,
      );
    },
  );
});

describe('the backend message', () => {
  it.each([
    [400, 'Revisa los campos enviados'],
    [401, 'Credenciales inválidas'],
    [403, 'No tienes permiso'],
    [404, 'Solicitud no encontrada'],
    [409, 'El correo ya está registrado'],
    [422, 'Dirección inválida'],
  ])(
    'is shown for a %i, because it names the exact problem',
    (status, text) => {
      expect(describeApiError(failure(status, { message: text })).message).toBe(
        text,
      );
    },
  );

  it('falls back to `detail` as the client does', () => {
    expect(
      describeApiError(failure(409, { detail: 'Ya existe' })).message,
    ).toBe('Ya existe');
  });

  it.each([429, 500, 503])('is never shown for a %i', (status) => {
    const description = describeApiError(
      failure(status, { message: 'NullPointerException at Foo.java:42' }),
    );
    expect(description.message).not.toMatch(/NullPointer/);
  });

  it('keeps the field errors of a validation answer', () => {
    const description = describeApiError(
      failure(400, {
        message: 'Revisa los campos enviados',
        errors: { email: 'Formato inválido', password: 'Muy corta' },
      }),
    );
    expect(description.fieldErrors).toEqual({
      email: 'Formato inválido',
      password: 'Muy corta',
    });
  });

  it('has no field errors otherwise', () => {
    expect(describeApiError(failure(500)).fieldErrors).toEqual({});
    expect(describeApiError(new NetworkError('x')).fieldErrors).toEqual({});
    expect(describeApiError(null).fieldErrors).toEqual({});
  });
});

describe('failures without an HTTP answer', () => {
  it('explains a network failure and allows trying again', () => {
    expect(
      describeApiError(new NetworkError('Network request failed')),
    ).toEqual({
      kind: 'network',
      title: 'Connection problem',
      message:
        'We could not reach the server. Check your connection and try again.',
      retryable: true,
      fieldErrors: {},
    });
  });

  it('tells when the browser is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const description = describeApiError(new NetworkError('x'));
    expect(description).toMatchObject({ kind: 'offline', retryable: true });
    expect(description.message).toMatch(/offline/);
  });

  it('explains a timeout', () => {
    const description = describeApiError(
      new DOMException('Request to /x timed out', 'TimeoutError'),
    );
    expect(description).toMatchObject({ kind: 'timeout', retryable: true });
    expect(description.message).not.toMatch(/\/x/);
  });

  it('marks a cancellation, which is not to be shown', () => {
    expect(
      describeApiError(new DOMException('aborted', 'AbortError')).kind,
    ).toBe('cancelled');
    expect(describeApiError({ name: 'AbortError' }).kind).toBe('cancelled');
  });

  it.each([
    ['an Error', new Error('boom: internal detail')],
    ['a string', 'boom: internal detail'],
    ['null', null],
    ['undefined', undefined],
  ])('describes %s as unknown without leaking it', (_name, error) => {
    const description = describeApiError(error);
    expect(description).toMatchObject({ kind: 'unknown', retryable: false });
    expect(description.message).not.toMatch(/boom/);
  });
});

describe('with the real client', () => {
  function setup(routes: Routes) {
    const api = createFakeBackend(routes);
    return createAxiosClient({
      baseURL: 'http://localhost:8080/api',
      adapter: api.adapter,
    }).request;
  }

  async function rejection(promise: Promise<unknown>) {
    try {
      await promise;
    } catch (error) {
      return error;
    }
    throw new Error('Expected the request to fail');
  }

  it('describes a 409 with the backend text', async () => {
    const request = setup({
      'POST /users': () => errorResponse(409, 'El correo ya está registrado'),
    });
    const error = await rejection(request('/users', { method: 'POST' }));
    expect(describeApiError(error)).toMatchObject({
      kind: 'conflict',
      message: 'El correo ya está registrado',
    });
  });

  it('describes a 503 with friendly text', async () => {
    const request = setup({
      'GET /requests': () => errorResponse(503, 'Service Unavailable'),
    });
    const error = await rejection(request('/requests'));
    expect(describeApiError(error)).toMatchObject({
      kind: 'server',
      retryable: true,
    });
    expect(describeApiError(error).message).not.toMatch(/Unavailable/);
  });

  it('describes a dead network', async () => {
    const request = setup({
      'GET /requests': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(describeApiError(await rejection(request('/requests'))).kind).toBe(
      'network',
    );
  });

  it('describes a timeout', async () => {
    const request = setup({
      'GET /requests': () => new Promise<Response>(() => undefined),
    });
    expect(
      describeApiError(await rejection(request('/requests', { timeoutMs: 5 })))
        .kind,
    ).toBe('timeout');
  });

  it('describes a cancellation', async () => {
    const request = setup({
      'GET /requests': () => new Promise<Response>(() => undefined),
    });
    const controller = new AbortController();
    const pending = rejection(
      request('/requests', { signal: controller.signal }),
    );
    controller.abort();
    expect(describeApiError(await pending).kind).toBe('cancelled');
  });
});
