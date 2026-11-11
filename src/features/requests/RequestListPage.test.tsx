import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import { aRequest } from '../../test/fixtures';
import { pageOf, renderPage } from '../../test/renderPage';
import { listServiceRequests } from './api';
import { RequestListPage } from './RequestListPage';

vi.mock('./api', () => ({ listServiceRequests: vi.fn() }));
const list = vi.mocked(listServiceRequests);

const PATH = '/client/requests';

describe('RequestListPage', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('lists the requests of the page with pagination from the backend', async () => {
    list.mockResolvedValue(
      pageOf([aRequest(), aRequest({ id: 8, status: 'CON_PROPUESTAS' })], {
        totalElements: 25,
      }),
    );
    renderPage(<RequestListPage />, { path: PATH });

    const items = await screen.findAllByRole('article');
    expect(items).toHaveLength(2);
    expect(
      within(items[0]!).getByRole('link', { name: /Refrigerator/ }),
    ).toHaveAttribute('href', '/client/requests/7');
    expect(within(items[1]!).getByText('Has offers')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(
      { page: 0, size: 10, status: undefined, search: '', sort: 'newest' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reads page, filter, search and sort from the URL and writes them back', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(
      pageOf([aRequest()], { page: 1, totalElements: 15 }),
    );
    const { router } = renderPage(<RequestListPage />, {
      path: PATH,
      url: `${PATH}?page=2&status=PUBLICADA&search=lg&sort=oldest`,
    });
    await screen.findByRole('article');
    expect(list).toHaveBeenLastCalledWith(
      { page: 1, size: 10, status: 'PUBLICADA', search: 'lg', sort: 'oldest' },
      expect.anything(),
    );

    await user.selectOptions(screen.getByLabelText('Status'), 'CERRADA');
    expect(router.state.location.search).toBe(
      '?status=CERRADA&search=lg&sort=oldest',
    );
    await user.selectOptions(screen.getByLabelText('Sort'), 'newest');
    expect(router.state.location.search).toBe('?status=CERRADA&search=lg');

    await user.clear(
      screen.getByRole('searchbox', { name: 'Search requests' }),
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search requests' }),
      'samsung',
    );
    await waitFor(() =>
      expect(router.state.location.search).toBe(
        '?status=CERRADA&search=samsung',
      ),
    );

    await user.click(await screen.findByRole('button', { name: 'Page 1' }));
    expect(router.state.location.search).not.toContain('page=');
  });

  it('invites to publish the first request when there are none', async () => {
    list.mockResolvedValue(pageOf([]));
    renderPage(<RequestListPage />, { path: PATH });
    expect(await screen.findByText('No requests yet')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'New request' })).toHaveLength(
      2,
    );
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(pageOf([]));
    const { router } = renderPage(<RequestListPage />, {
      path: PATH,
      url: `${PATH}?status=CANCELADA&search=zzz`,
    });
    await user.click(
      await screen.findByRole('button', { name: 'Clear filters' }),
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('sends the visitor of a page past the end to the last one', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(pageOf([], { page: 8, totalElements: 30 }));
    const { router } = renderPage(<RequestListPage />, {
      path: PATH,
      url: `${PATH}?page=9`,
    });
    await user.click(
      await screen.findByRole('button', { name: 'Go to the last page' }),
    );
    expect(router.state.location.search).toBe('?page=3');
  });

  it('explains an error that asking again cannot fix, without a retry', async () => {
    list.mockImplementation(() =>
      Promise.reject(new ApiError(403, 'Forbidden', {})),
    );
    renderPage(<RequestListPage />, { path: PATH });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('retries a server failure on its own, then lets the user try again', async () => {
    const user = userEvent.setup();
    const down = new ApiError(503, 'Unavailable', null);
    list
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockResolvedValueOnce(pageOf([aRequest()]));
    renderPage(<RequestListPage />, { path: PATH });
    const retry = await screen.findByRole(
      'button',
      { name: 'Try again' },
      { timeout: 5000 },
    );
    expect(list).toHaveBeenCalledTimes(3);
    await user.click(retry);
    expect(await screen.findByRole('article')).toBeInTheDocument();
  });
});
