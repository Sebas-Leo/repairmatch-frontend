import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import type {
  Page,
  ServiceRequest,
  ServiceRequestsQuery,
} from '../../shared/api/types';
import { aRequest } from '../../test/fixtures';
import { pageOf, renderPage } from '../../test/renderPage';
import { listServiceRequests } from './api';
import { RequestListPage } from './RequestListPage';

vi.mock('./api', () => ({ listServiceRequests: vi.fn() }));
vi.mock('../services/api', () => ({ listServices: vi.fn(async () => []) }));
vi.mock('../proposals/api', () => ({
  listRequestProposals: vi.fn(async () => []),
}));
const list = vi.mocked(listServiceRequests);

const PATH = '/client/requests';

/** The KPI totals ask for one-item pages; the list is everything else. */
function answer(
  main: (query: ServiceRequestsQuery) => Promise<Page<ServiceRequest>>,
) {
  list.mockImplementation(async (query = {}) =>
    query.size === 1 && query.page === undefined
      ? pageOf([], { size: 1, totalElements: 4 })
      : main(query),
  );
}

function mainCalls() {
  return list.mock.calls.filter(
    ([q]) => !(q?.size === 1 && q.page === undefined),
  );
}

describe('RequestListPage', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('lists the requests of the page with pagination from the backend', async () => {
    answer(async () =>
      pageOf([aRequest(), aRequest({ id: 8, status: 'CON_PROPUESTAS' })], {
        totalElements: 25,
      }),
    );
    renderPage(<RequestListPage />, { path: PATH });

    const items = await screen.findAllByRole('article');
    expect(items).toHaveLength(2);
    expect(
      within(items[0]!).getByRole('link', { name: /Samsung/ }),
    ).toHaveAttribute('href', '/client/requests/7');
    expect(within(items[1]!).getByText('Con ofertas')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(
      { page: 0, size: 10, status: undefined, search: '', sort: 'newest' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reads page, filter, search and sort from the URL and writes them back', async () => {
    const user = userEvent.setup();
    answer(async () => pageOf([aRequest()], { page: 1, totalElements: 15 }));
    const { router } = renderPage(<RequestListPage />, {
      path: PATH,
      url: `${PATH}?page=2&status=PUBLICADA&search=lg&sort=oldest`,
    });
    await screen.findByRole('article');
    expect(mainCalls().at(-1)?.[0]).toEqual({
      page: 1,
      size: 10,
      status: 'PUBLICADA',
      search: 'lg',
      sort: 'oldest',
    });

    await user.click(screen.getByRole('tab', { name: 'Cerradas' }));
    expect(router.state.location.search).toBe(
      '?status=CERRADA&search=lg&sort=oldest',
    );
    await user.selectOptions(screen.getByLabelText('Ordenar'), 'newest');
    expect(router.state.location.search).toBe('?status=CERRADA&search=lg');

    const box = screen.getByRole('searchbox', { name: 'Buscar solicitudes' });
    await user.clear(box);
    await user.type(box, 'samsung');
    await waitFor(() =>
      expect(router.state.location.search).toBe(
        '?status=CERRADA&search=samsung',
      ),
    );

    await user.click(await screen.findByRole('button', { name: 'Page 1' }));
    expect(router.state.location.search).not.toContain('page=');
  });

  it('shows totals by state and the services in progress', async () => {
    answer(async () => pageOf([aRequest()]));
    renderPage(<RequestListPage />, { path: PATH });
    expect(
      await screen.findByText('Con ofertas por revisar'),
    ).toBeInTheDocument();
    expect(screen.getByText('En curso')).toBeInTheDocument();
    expect((await screen.findAllByText('4')).length).toBeGreaterThan(0);
  });

  it('invites to publish the first request when there are none', async () => {
    answer(async () => pageOf([]));
    renderPage(<RequestListPage />, { path: PATH });
    expect(
      await screen.findByText('Aún no tienes solicitudes'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Nueva solicitud' }),
    ).toHaveLength(2);
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    answer(async () => pageOf([]));
    const { router } = renderPage(<RequestListPage />, {
      path: PATH,
      url: `${PATH}?status=CANCELADA&search=zzz`,
    });
    await user.click(
      await screen.findByRole('button', { name: 'Quitar filtros' }),
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('sends the visitor of a page past the end to the last one', async () => {
    const user = userEvent.setup();
    answer(async () => pageOf([], { page: 8, totalElements: 30 }));
    const { router } = renderPage(<RequestListPage />, {
      path: PATH,
      url: `${PATH}?page=9`,
    });
    await user.click(
      await screen.findByRole('button', { name: 'Ir a la última página' }),
    );
    expect(router.state.location.search).toBe('?page=3');
  });

  it('explains an error that asking again cannot fix, without a retry', async () => {
    answer(() => Promise.reject(new ApiError(403, 'Forbidden', {})));
    renderPage(<RequestListPage />, { path: PATH });
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('retries a server failure on its own, then lets the user try again', async () => {
    const user = userEvent.setup();
    const down = new ApiError(503, 'Unavailable', null);
    let calls = 0;
    answer(async () => {
      calls += 1;
      if (calls <= 3) throw down;
      return pageOf([aRequest()]);
    });
    renderPage(<RequestListPage />, { path: PATH });
    const retry = await screen.findByRole(
      'button',
      { name: 'Try again' },
      { timeout: 5000 },
    );
    expect(calls).toBe(3);
    await user.click(retry);
    expect(await screen.findByRole('article')).toBeInTheDocument();
  });
});
