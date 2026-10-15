# Contributing

Keep changes small enough to understand and verify. Use short-lived branches and pull requests into `main`; write Conventional Commits without co-author or AI attribution trailers.

## Before opening a pull request

1. Describe the user-facing behavior and what is intentionally out of scope.
2. Add or update tests beside changed behavior; run `npm run verify` and the browser smoke checks when navigation/layout changes.
3. Explain backend-contract changes and verification gaps. Never commit `.env`, credentials, real tokens, or personal data.

No linked issue or human approval is required by this project's contribution workflow. Automated checks and AI review support the team; neither guarantees correctness. Read findings critically, fix confirmed issues, and disclose unresolved risks. Do not claim an AI review ran unless the integration actually produced a review.

## Code conventions

- Strict TypeScript, function components, English identifiers/copy, semantic HTML, keyboard support, responsive layouts.
- Keep domain behavior in feature modules as it emerges. Shared code must have an actual consumer or a clear transport/configuration responsibility.
- Prefer the existing native fetch client to duplicate request logic. API types are not runtime validation.
- Do not persist tokens or add refresh retries without an explicit security design and tests.
- Use `npm run format` to format and commit `package-lock.json` with dependency changes. Do not bypass peer-dependency conflicts or use audit fixes with `--force` blindly.
