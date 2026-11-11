import type { RouteObject } from 'react-router';
import { lazyPage } from '../../shared/routing/lazyPage';

/** Technician screens of the proposals module, under /technician. */
export default [
  {
    path: 'proposals',
    element: lazyPage(() => import('./MyProposalsPage'), 'MyProposalsPage'),
  },
  {
    path: 'opportunities/:requestId/offer',
    element: lazyPage(
      () => import('./SubmitProposalPage'),
      'SubmitProposalPage',
    ),
  },
] satisfies RouteObject[];
