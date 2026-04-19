# Stage 3 — Implement

## Code Changes

- Added `apps/api/src/smtp/smtp.config.ts` with a typed env-driven SMTP config factory and an injection token.
- Added `apps/api/src/smtp/smtp.module.ts` to expose the SMTP configuration through Nest dependency injection.
- Updated `apps/api/src/app.module.ts` to import `SmtpModule`.
- Added `apps/api/src/smtp/smtp.config.test.ts` for SMTP parsing, alias support, and validation behavior.
- Updated `apps/api/src/app.module.test.ts` to verify module wiring.
- Updated `.env.example` with provider-neutral SMTP variables using Resend SMTP as the current example.

## Quality Gates

- `pnpm lint` — passed
- `pnpm test` — passed
- `pnpm build` — passed

## Coverage Impact

- `@cvforge/api` coverage after the change: `98.27%` lines, `93.1%` branches, `100%` functions.
- New SMTP code coverage is above the project thresholds and the task-specific code paths are directly exercised by unit tests.

## Blocking Issues

- None after fixing the initial TypeScript narrowing error in the config factory.

## Pass Check

- Code changes are described: yes
- Tests and quality gates are run or explicitly blocked: yes
- Coverage impact is stated: yes
