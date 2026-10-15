import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptProposal, listRequestProposals, submitProposal } from './api';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ api: { request } }));

beforeEach(() => {
  request.mockReset().mockResolvedValue('response');
});

const proposal = {
  diagnosticCost: 25.5,
  availableAt: '2030-01-02T09:30:00',
  conditions: 'Parts not included',
};

describe('proposal endpoints match the backend contract', () => {
  it.each([
    [
      'submit',
      () => submitProposal(4, proposal),
      '/requests/4/proposals',
      { method: 'POST', body: proposal },
    ],
    [
      'list for a request',
      () => listRequestProposals(4),
      '/requests/4/proposals',
      {},
    ],
    [
      'accept',
      () => acceptProposal(9),
      '/proposals/9/accept',
      { method: 'POST' },
    ],
  ])('%s', async (_name, call, path, options) => {
    expect(await call()).toBe('response');
    expect(request).toHaveBeenCalledExactlyOnceWith(path, options);
  });
});
