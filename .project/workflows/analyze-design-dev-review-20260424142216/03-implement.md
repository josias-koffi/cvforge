# Implement

Implemented in `apps/app/app/dashboard/`:
- added `share-card-content.ts` to build the branded SVG card and the LinkedIn offsite share URL
- added `share-card.tsx` as a client share panel with SVG preview, download action, native `navigator.share` handling, and LinkedIn fallback
- wired the new section into `page.tsx` using live dashboard metrics and the app URL
- added `share-card-content.test.ts` and extended `page.test.tsx`

Quality gates:
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/app build` ✅
- `pnpm test -- --coverage` ✅

Coverage impact:
- `@cvforge/app`: `84.07%` lines, `72.2%` branches
- both stay above the blocking thresholds from `engineering-standards.md`
