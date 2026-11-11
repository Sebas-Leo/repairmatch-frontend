import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import { anOpportunity } from '../../test/fixtures';
import { pageOf, renderPage } from '../../test/renderPage';
import { listMatchingRequests } from './api';
import { OpportunitiesPage } from './OpportunitiesPage';

vi.mock('./api', () => ({ listMatchingRequests: vi.fn() }));
const list = vi.mocked(listMatchingRequests);
const PATH = '/technician/opportunities';

function setup(url = PATH) {
  return renderPage(<OpportunitiesPage />, {
    path: PATH,
    url,
    role: 'TECHNICIAN',
  });
}

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('lists nearby requests with their distance and pages them', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(
      pageOf([anOpportunity(), anOpportunity({ requestId: 8, brand: null })], {
        size: 25,
        totalElements: 60,
      }),
    );
    const { router } = setup(`${PATH}?size=25`);
    const items = await screen.findAllByRole('article');
    expect(items[0]).toHaveTextContent('2.3 km away');
    expect(screen.getByText('Showing 1–25 of 60')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(
      { page: 0, size: 25 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(router.state.location.search).toBe('?size=25&page=2');
  });

  it('asks to configure the profile when matching is not possible yet', async () => {
    list.mockImplementation(() =>
      Promise.reject(new ApiError(404, 'Not found', {})),
    );
    setup();
    expect(
      await screen.findByText('Set up your service area first'),
    ).toBeInTheDocument();
  });

  it('shows other failures as errors', async () => {
    list.mockImplementation(() =>
      Promise.reject(new ApiError(403, 'Forbidden', {})),
    );
    setup();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('explains an empty area and a page past the end', async () => {
    list.mockResolvedValueOnce(pageOf([]));
    const { unmount } = setup();
    expect(
      await screen.findByText('No requests nearby right now'),
    ).toBeInTheDocument();
    unmount();
    list.mockResolvedValueOnce(pageOf([], { page: 4, totalElements: 12 }));
    setup(`${PATH}?page=5`);
    expect(await screen.findByText('This page is empty')).toBeInTheDocument();
  });

  it('keeps the loaded page and reports a failed page change', async () => {
    const user = userEvent.setup();
    list
      .mockResolvedValueOnce(pageOf([anOpportunity()], { totalElements: 30 }))
      .mockImplementation(() =>
        Promise.reject(new ApiError(403, 'Forbidden', {})),
      );
    setup();
    await screen.findByRole('article');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('sends a visitor past the end to the last page', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(pageOf([], { page: 6, totalElements: 30 }));
    const { router } = setup(`${PATH}?page=7`);
    await user.click(
      await screen.findByRole('button', { name: 'Go to the last page' }),
    );
    expect(router.state.location.search).toBe('?page=3');
  });
});
