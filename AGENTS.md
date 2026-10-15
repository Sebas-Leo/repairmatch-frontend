# Agent instructions

## Scope and implementation

- Use English for code, UI copy, comments and documentation. Keep responses concise and match the user's language.
- Preserve unrelated work. Inspect the current directory and Git state before edits; do not change the backend repository from this frontend task.
- Use React function components, strict TypeScript and the existing router/HTTP client. Add feature structure only when it has real behavior.
- Keep credentials, real tokens and personal data out of code, logs, tests and `VITE_*` configuration. Never claim browser configuration is private.
- Do not implement token persistence, refresh rotation, authentication or authorization implicitly. Server authorization is mandatory regardless of UI checks.
- Run relevant tests and `npm run verify`. Distinguish executed checks from untested assumptions. Never report a backend integration, deployment or AI review as verified without evidence.
- Use Conventional Commits. Never add `Co-Authored-By` or AI attribution. No mandatory human approval or linked issue is part of this workflow.

## Code Review Rules

Prioritize correctness, security, backend-contract compatibility, accessibility and regressions. Review changed behavior and its consumers rather than rewriting style preferences.

- Verify request paths, payloads, error responses and auth expectations against the backend contract. Treat generic TypeScript response types as unchecked external data.
- Flag leaked credentials, unsafe token storage, open redirects, cross-origin bearer transmission, bypassed authorization, unsafe HTML and sensitive logging.
- Check cancellation, network failures, empty responses and concurrency where relevant. Do not assume a failed request is safe to retry.
- Check keyboard access, semantic controls, meaningful errors and small-screen layouts.
- Report actionable findings with severity, file/line evidence, failure scenario, and a proposed verification. Separate confirmed defects from questions and verification gaps. If no findings are confirmed, say so and list material untested risks.
- AI review and green CI are not guarantees, security certification, or human approval. Do not fabricate execution results or require an approval label absent from repository policy.
