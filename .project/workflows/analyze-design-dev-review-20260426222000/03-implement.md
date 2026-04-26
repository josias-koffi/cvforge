# Stage 3 — Implement

**Agent**: developer  
**Task**: US-060 — Navigation sidebar desktop-first + drawer mobile

## Changes delivered

### New file
- `packages/ui/src/shell-mobile-nav.tsx` — `"use client"` component for hamburger + drawer slide-in

### Modified files

**`packages/ui/src/shell.tsx`**
- New props: `userEmail?`, `userRole?`, `breadcrumb?`
- `filterNavForRole()` hides `requiresAdmin` items for non-admin users
- `ShellTopBar` server component: sticky 56px top bar with eyebrow badge, breadcrumb nav, notification bell, avatar circle
- `DesktopSidebar` server component: 240px fixed sidebar, renders `navigation`
- `AppShell` renders page heading (`h1` title + description) inside `<main>`

**`packages/ui/src/styles.tsx`**
- New CSS: `.cvforge-shell__topbar`, `.cvforge-shell__avatar`, `.cvforge-shell__breadcrumb*`, `.cvforge-shell__hamburger*`, `.cvforge-shell__drawer*`, `.cvforge-shell__page-header*`
- `@media (≥768px)`: hide hamburger, show topbar brand badge
- `@media (≥1024px)`: show 240px fixed sidebar, hide hamburger, hide bottom nav

**`packages/ui/src/index.tsx`**
- Export `MobileDrawerNav`

**`apps/app/app/content.ts`**
- Updated nav items: Dashboard, Candidatures, Interview, Documents, Crédits, Profil, Notifications, Admin (requiresAdmin: true)
- `getAppNavigation(route, role?)` — filters admin for non-admin roles
- Sub-path active matching (`href === activeHref || activeHref.startsWith(href + "/")`)

**12 authenticated pages** — added `userEmail`, `userRole`, `breadcrumb` props from existing `requireSession()` / `requireAdminSession()` calls

**Test updates**
- `packages/ui/src/index.test.tsx` — updated AppShell tests for new structure
- `apps/app/app/content.test.ts` — rewrote with role-gating coverage
- `apps/app/app/page.test.tsx` — updated "Sections principales" → "Navigation principale"

## Quality gates
- `pnpm test`: 6 task packages, 204 tests — ALL PASS
- `pnpm lint`: 6 packages — ALL PASS
- `pnpm build`: Next.js app + API build — ALL PASS

## Coverage impact
All touched files are covered by updated or pre-existing tests. New `shell-mobile-nav.tsx` covered via `index.test.tsx` renderToStaticMarkup (hamburger button rendered SSR-safe).

## Pass
- Code changes delivered
- Tests green
- Build clean
