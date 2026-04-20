# Implement

## Code Changes
- Added `TemplateRecord` and `TemplateUpsertInput` to `packages/types`.
- Added a new API templates slice:
  - `templates.config.ts`
  - `templates.types.ts`
  - `templates.store.ts`
  - `templates.service.ts`
  - `templates.controller.ts`
  - `templates.module.ts`
- Registered `TemplatesModule` in `apps/api/src/app.module.ts`.
- Added an admin templates studio in `apps/app/app/admin/templates/` with:
  - library view
  - create form
  - edit form
  - live block preview
  - save and duplicate route handlers
- Extended the shared app navigation to include `/admin` and `/admin/templates`.

## Tests Added
- API:
  - templates config
  - store
  - service
  - controller
  - module
- App:
  - admin templates page
  - save route
  - duplicate route
- Types:
  - template contract coverage

## Quality Gates
- `pnpm test` passed
- `pnpm lint` passed
- `pnpm build` passed

## Coverage Impact
- New templates slice is covered by unit tests across the API, app, and types packages.
