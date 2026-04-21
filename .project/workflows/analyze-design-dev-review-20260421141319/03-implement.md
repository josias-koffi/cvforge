# Stage 3 — Implement

## Code changes

- Added a new credits slice under `apps/api/src/credits/`:
  - config, file store, service, controller, module
  - admin manual grant path and user/admin read endpoints
- Extended `@cvforge/types` with:
  - AI credit action constants
  - pricing map
  - ledger entry and summary contracts
- Wired `CreditsModule` into the API app and injected `CreditsService` into:
  - `ApplicationsService` for offer enrichment debits
  - `CvGenerationService` for CV/letter debits
- Added focused tests for:
  - ledger behavior
  - admin access rules
  - AI debit hooks
  - updated module metadata

## Consumption rules implemented

- Offer enrichment: `1` credit
- CV generation: `3` credits
- Letter generation: `3` credits

## Quality gates

- `pnpm --filter @cvforge/api test -- src/credits/credits.service.test.ts src/credits/credits.controller.test.ts src/applications/applications.service.test.ts src/cv-generation/cv-generation.service.test.ts src/applications/applications.module.test.ts src/cv-generation/cv-generation.module.test.ts src/app.module.test.ts`
- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/api build`

## Coverage impact

Targeted API tests passed after the changes. New code paths in the credits slice and debit hooks are covered by unit tests.

## Pass Verdict

Implementation complete with passing API tests, lint, and build.
