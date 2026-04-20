# Stage 3 — Implement

## Code Changes

- Ajout de la collecte de consentement sur:
  - `apps/app/app/login/page.tsx`
  - `apps/app/app/register/invitation/page.tsx`
- Enforcement avant appel API dans:
  - `apps/app/app/login/request/route.ts`
  - `apps/app/app/register/invitation/accept/route.ts`
- Enforcement et persistence cote auth dans:
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth-account-store.ts`
  - `apps/api/src/auth/auth.types.ts`
- Ajout d'un module de garde-fous local:
  - `apps/app/app/input-guards.ts`
- Reutilisation de ces garde-fous dans:
  - `apps/app/app/onboarding/draft.ts`
  - `apps/app/app/profile/base-profile.ts`
- Documentation des gaps restants dans `.project/sprints/sprint-009.md`.

## Validation Evidence

- `pnpm --filter @cvforge/app lint`
- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/app test`
- `pnpm --filter @cvforge/api test`
- `pnpm lint`
- `pnpm test`
- `pnpm --filter @cvforge/api build`

## Coverage Impact

- `@cvforge/app`: `93.82%` lignes, `90.4%` branches.
- `@cvforge/api`: `89.16%` lignes, `81.81%` branches.
- Les slices touchees restent au-dessus des seuils bloquants du projet.

## Build Advisory

- `pnpm --filter @cvforge/app build` reste bloque par un probleme pre-existant de permissions dans `apps/app/.next`.
- Le blocage est environnemental: `EACCES` sur des artefacts generes hors de la session courante, et non une erreur logique du changement `US-016`.
