# RepairMatch frontend

A React + TypeScript single-page application for RepairMatch. This repository currently contains the application foundation, not a completed product: home and 404 pages, a JSON API client, automated checks, and no authentication or service-booking flows.

## Start locally

Use Node.js 24 LTS (see `.nvmrc`) and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173. On PowerShell, use `Copy-Item .env.example .env` instead of `cp` if needed. The dev server fails if port 5173 is occupied, keeping the backend CORS origin predictable.

## Verify a change

```sh
npm run verify
npx playwright install chromium
npm run test:e2e
```

`verify` checks formatting, types, lint, unit/component tests with coverage, and a production build. `test:e2e` builds and smoke-tests the preview in desktop and mobile Chromium. GitHub Actions is configured to run both and publish test artifacts in the **Frontend verify** check; the first Linux CI run is still pending. These are deterministic checks, not an AI analysis or proof of correctness. Native AI code review is **pending and not yet verified**; enable and confirm it separately in [Codex code review settings](https://chatgpt.com/settings/code-review). Its availability and usage limits depend on that integration. No API key or paid API workflow is included here.

## Structure

| Path                | Responsibility                    |
| ------------------- | --------------------------------- |
| `src/app`           | Application shell, routes, styles |
| `src/pages`         | Route-level screens               |
| `src/shared/api`    | JSON transport and HTTP errors    |
| `src/shared/config` | Public environment configuration  |
| `e2e`               | Browser smoke checks              |

Add feature folders when a real feature exists. Do not add empty architectural layers in advance.

## Backend connection

`VITE_API_BASE_URL` defaults to `http://localhost:8080/api`, the local backend address, **not a verified deployed service**. The backend must run separately. All `VITE_*` values are included in the browser bundle: never store secrets there. The backend currently permits local origins `http://localhost:5173` and `http://localhost:3000`; production origins must be configured on the backend.

The existing backend contract includes:

- `POST /auth/login`: `{ email, password }` → `{ accessToken, tokenType, expiresIn, refreshToken, refreshExpiresIn }`.
- `GET /users/me`: bearer-authenticated `{ id, name, email, role }`, with `CLIENT` or `TECHNICIAN` roles.
- `POST /auth/refresh` and `POST /auth/logout`: `{ refreshToken }`; logout returns 204. Refresh rotates the previous token.
- Errors can include `{ timestamp, status, error, message, path, errors, detail }`, where `errors` maps fields to messages. Catalog routes require authentication.

The client accepts API paths such as `/users/me`, optional explicit bearer tokens, JSON bodies and `AbortSignal`. It returns `undefined` for empty success bodies and throws `ApiError` with `status` and `body` for HTTP failures. Network and cancellation errors remain their original errors. Generic response types document expectations; validate untrusted response shapes at the feature boundary when features are implemented.

No tokens are stored, cookies sent, or refresh attempts performed. Future authentication work must decide storage and threat model, and coordinate concurrent refreshes; do not add naive automatic retries. Frontend role checks are presentation only: authorization belongs on the server.

## Deployment boundary

`npm run build` outputs `dist/`. Configure the production API URL **before** building, use HTTPS, and configure the static host to rewrite non-asset routes to `index.html` for BrowserRouter. There is no production deployment configured yet. Tests use mocked HTTP responses; a real backend integration test is still required before shipping API features.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution and review workflow.
