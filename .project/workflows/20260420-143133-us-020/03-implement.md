# Stage 3 — Implement

## Verdict

Pass

## Code Changes

- `packages/types`
  - added the shared candidature status contract
  - added allowed transition metadata
  - added timestamped status-history entries
  - added KPI summary shape for dashboard consumption
- `apps/api/src/applications`
  - migrated the store contract from draft-only persistence to generic save/find
  - normalized legacy persisted applications that do not yet have status history
  - added explicit status-transition logic with business-rule validation
  - added KPI summary aggregation
  - added `GET /applications/summary`
  - added `POST /applications/:applicationId/status`
- `apps/app/app/candidatures`
  - surfaced the current status on each candidature card
  - added manual transition buttons limited to allowed next states
  - rendered timestamped status history
  - added a dedicated Next route to proxy status updates to the API
- `apps/app/app/dashboard`
  - replaced the placeholder-only dashboard with KPI cards and per-status counts
  - consumed the same API summary used by the candidature flow

## Business Rules Implemented

- Statuses:
  `draft`, `sent`, `interview_scheduled`, `rejected`, `offer_received`
- Allowed transitions:
  - `draft -> sent`
  - `sent -> interview_scheduled | rejected | offer_received`
  - `interview_scheduled -> rejected | offer_received`
  - `rejected` terminal
  - `offer_received` terminal
- Every status change appends a timestamped history entry.

## Validation Evidence

- `pnpm --filter @cvforge/types test -- --runInBand`
  - passed
  - `100%` lines / `100%` branches in `packages/types/src/index.ts`
- `pnpm --filter @cvforge/api test -- --runInBand ...applications...`
  - passed
  - workspace report: `90.22%` lines / `80.35%` branches overall
  - `src/applications`: `90.65%` lines / `76.08%` branches
- `pnpm --filter @cvforge/app test -- --runInBand ...candidatures...dashboard...`
  - passed
  - workspace report: `93.52%` lines / `82.56%` branches overall
  - `app/app/candidatures/page.tsx`: `96.01%` lines
- `pnpm lint`
  - passed
- `pnpm --filter @cvforge/api build`
  - passed
- `pnpm --filter @cvforge/app build`
  - blocked by pre-existing filesystem permissions in `apps/app/.next`
  - error: `EACCES: permission denied, unlink '/home/devops/perso/projets/cvforge/apps/app/.next/server/app-paths-manifest.json'`

## Coverage Impact

Touched code remains above the blocking thresholds from the engineering spec,
and the new status domain is directly covered in shared types, API logic, and
app rendering/route tests.
