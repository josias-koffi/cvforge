# Stage 03 — Implement

## Changes Made

- Added shadcn-style runtime helpers to `@cvforge/ui`: `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, and `tailwind-merge`.
- Split `packages/ui` into reusable primitives: `Button`, `Badge`, `Card`, `Label`, `Input`, `Textarea`, `PaperStyles`, and `AppShell`.
- Centralized the base component and shell CSS in `packages/ui/src/styles.tsx`, driven by the existing token exports from `design-system.ts`.
- Updated both Next.js layouts to inject `PaperStyles` globally so the shared primitives render consistently in `app` and `landing`.
- Expanded `packages/ui` tests to verify the exported primitives and the rendered shell composition.
- Added `ADR-001` because the engineering standards require an ADR for new library adoption.

## Validation

- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ✅

## Coverage Impact

- `@cvforge/ui` coverage after the change: `100%` lines, `93.75%` branches.
- `@cvforge/app` coverage after the change: `100%` lines, `100%` branches.
- `@cvforge/landing` coverage after the change: `100%` lines, `100%` branches.
- New code remains above the blocking thresholds in the engineering spec.

## Blockers

- None.
