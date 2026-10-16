import { createAxiosClient } from '../api/axiosClient';
import { apiBaseUrl } from '../config/env';
import { createSession } from './session';
import { createBrowserTokenStore } from './tokenStore';

/**
 * The application-wide session. To change where tokens are kept, pass another
 * `TokenStore` here (see `tokenStore.ts`); nothing else needs to change.
 * `createSession` plugs itself into the axios client, which is how every
 * request gets the session's bearer token and refreshes on a 401.
 */
export const appSession = createSession({
  http: createAxiosClient({ baseURL: apiBaseUrl }),
  tokenStore: createBrowserTokenStore(),
});
