# Stage 3 — Implement

- Agent: `developer`
- Verdict: `passed`

## Code Changes

- Refactored `packages/ui/src/shell.tsx` into a configurable shared shell with:
  - typed `ShellNavItem` navigation input
  - mobile bottom navigation for primary sections
  - desktop sidebar navigation from `lg`
  - optional `children` support so future authenticated screens can reuse the same frame
- Extended `packages/ui/src/styles.tsx` with responsive navigation styles, safe-area bottom spacing, and the `lg` shell layout.
- Exported the shared navigation type from `packages/ui/src/index.tsx`.
- Updated `apps/app/app/content.ts` and `apps/landing/app/content.ts` to define their shell navigation models.
- Updated both Next.js pages to pass the shared navigation config.
- Expanded UI and page tests to assert the responsive navigation contract.

## Quality Gates

- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ✅

## Coverage Impact

- `@cvforge/ui`: 100% lines, 92% branches overall; `shell.tsx` remains at 100% lines and 90% branches
- `@cvforge/app`: 100% lines / branches
- `@cvforge/landing`: 100% lines / branches

New code stays above the engineering-spec minimums and the touched UI shell remains fully line-covered.
