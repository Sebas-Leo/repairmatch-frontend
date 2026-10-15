import { apiRequest } from '../api/http';
import { createSession } from './session';
import { createBrowserTokenStore } from './tokenStore';

/**
 * The application-wide session. To change where tokens are kept, pass another
 * `TokenStore` here (see `tokenStore.ts`); nothing else needs to change.
 */
export const appSession = createSession({
  http: apiRequest,
  tokenStore: createBrowserTokenStore(),
});
