# Sprint 009 — US-032

## Task

Exposer le dashboard utilisateur avec KPI de base et accès rapides.

## Acceptance Criteria

- Les 7 KPI de base sont visibles
- Les accès rapides et les dernières candidatures sont affichés
- Les KPI sont alimentés par les données réelles du produit

## Scope Frozen

- `apps/app/app/dashboard/page.tsx`
- `apps/app/app/dashboard/page.test.tsx`

## Evidence

- Dashboard now fetches live application summary, live applications, and live credit balance.
- Seven base KPI cards are rendered from real product data: total applications, applications this month, response rate, responses received, interviews scheduled, offers received, remaining credits.
- Quick-access cards are rendered for applications, credits, profile, and interview.
- Recent applications are rendered from the latest updated user applications.
- Verification completed with `pnpm test`, `pnpm lint`, and `pnpm build`.
- Dependency audit could not run against the configured private registry because its audit endpoint is not implemented.
