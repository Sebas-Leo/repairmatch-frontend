# RepairMatch frontend

Minimal React + TypeScript foundation: home/404 routes, a JSON API client and automated checks. Product features are intentionally left for the team to build.

## Start locally

Use Node.js 24 LTS (`.nvmrc`) and npm:

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173. The backend runs separately. Set its public API address in `.env` using `VITE_API_BASE_URL` (default: `http://localhost:8080/api`). All `VITE_*` values are visible in the browser: never put secrets there. Configure the backend to allow the frontend origin through CORS.

## Verify and contribute

```sh
npm run verify
```

This checks formatting, strict types, lint, unit/component tests with coverage and the production build. Use `npm run format` to format changes.

Create a short-lived branch, implement one small change with tests, then open a PR into `main`. CI's **Frontend verify** check must pass; no human approval or linked issue is required. Use Conventional Commits without attribution trailers. Check keyboard access and responsive layouts when changing UI. Read review findings critically; green checks are not proof of correctness.

Automatic [Codex review](https://chatgpt.com/settings/code-review) is pending activation; CI remains required.

## Structure

| Path                | Responsibility                   |
| ------------------- | -------------------------------- |
| `src/app`           | App shell, routes and styles     |
| `src/pages`         | Route-level screens              |
| `src/shared/api`    | JSON transport and HTTP errors   |
| `src/shared/config` | Public environment configuration |

Add feature folders only when implementing real behavior. Keep tests beside the code they verify. Reuse the HTTP client and verify payloads against the separate backend; its response types are not runtime validation. Authentication and token storage are not implemented; agree on a secure design first. Authorization remains the backend's responsibility.

## Initial work allocation

**Adjustable proposal, not a confirmed team agreement.** These modules are not implemented yet. Each owner delivers their module's UI, API integration, loading/error states and tests—not documentation or testing alone.

| Owner              | Proposed module                                          |
| ------------------ | -------------------------------------------------------- |
| Sebas-Leo          | Authentication/session and role-based navigation         |
| AdrianPacheco12343 | Client requests and appliance catalog                    |
| andrehcv           | Technician profile, service areas and reputation display |
| becomon            | Proposals: opportunities, send, list and accept          |
| camilaalfaro-afk   | Service tracking, status actions and ratings             |

Integration order: session → requests/profile → proposals → services. Confirm each flow against the backend contract before implementation and coordinate changes to shared code.

Browser E2E tests are deferred to keep this starter light; unit tests do not cover real browser/backend integration. Reintroduce them with the first real session flow (proposed owner: Sebas-Leo).

## Deployment

`npm run build` writes `dist/`. Set the production API URL before building, use HTTPS and configure the host to serve `index.html` for client-side routes. No deployment or live backend integration is verified yet.
