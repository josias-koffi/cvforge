# Stage 3 — Implement

## Changes Delivered

- Added `packages/ui/src/design-system.ts` with centralized palette, typography, spacing, radius, shadow, and breakpoint tokens.
- Refactored `packages/ui/src/index.tsx` so `AppShell` consumes the shared tokens through CSS custom properties and exposes a visibly mobile-first paper-style shell.
- Updated `apps/app/app/layout.tsx` and `apps/landing/app/layout.tsx` to apply the shared body theme directly from the UI package.
- Extended tests in `packages/ui`, `apps/app`, and `apps/landing` to assert the new theme markers.
- Added package export `@cvforge/ui/design-system` so other workspaces can consume the shared token layer.

## Quality Gates

- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ✅

## Coverage Impact

- `@cvforge/ui`: 100% lines / 100% branches
- `@cvforge/app`: 100% lines / 100% branches
- `@cvforge/landing`: 100% lines / 100% branches

## Notes

- No new dependency or framework was introduced.
- The base shell stays single-column on mobile and upgrades to a three-card grid at `768px`.
