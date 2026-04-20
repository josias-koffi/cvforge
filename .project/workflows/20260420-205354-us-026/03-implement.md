# Stage 3 — Implement

## Verdict
Pass

## Code changes
- Added a `PUT /applications/:applicationId/cv` API path to persist edited CV content.
- Added a Next route bridge at `/cv/[applicationId]/save` to forward authenticated updates.
- Reworked the CV page into an editor shell that loads the stored CV and mounts a structured editor.
- Added a shared CV document preview component and responsive mobile/desktop CSS hooks.
- Added contract tests for the new request type, controller/service behavior, page rendering, and save route.

## Verification
- Targeted Vitest run: 39 tests passed across `packages/types`, `apps/api`, and `apps/app`.
- Targeted ESLint invocation produced only the repository's existing Next pages-directory warning.
- Prettier check passed after formatting the touched files.

## Coverage impact
- The touched API and app slices gained new tests around the new write path and editor rendering.

