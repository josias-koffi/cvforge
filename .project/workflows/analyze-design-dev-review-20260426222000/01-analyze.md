# Stage 1 — Analyze

**Agent**: product-owner  
**Task**: US-060 — Sidebar desktop-first + drawer mobile

## Scope verdict: CLEAR

### Boundary
US-060 is strictly a navigation shell refactor. Scope is limited to:
1. The `AppShell` component in `packages/ui/src/shell.tsx` and its CSS in `styles.tsx`
2. The navigation content definition in `apps/app/app/content.ts`
3. Passing new `userEmail`, `userRole`, `breadcrumb` props from authenticated pages that already call `requireSession()`

Out of scope: routing changes, page-level content, auth logic, API endpoints.

### Acceptance criteria — testable mapping

| Criterion | Test evidence |
|---|---|
| Sidebar 240px at ≥1024px | CSS `.cvforge-shell__sidebar { width: 240px }` at `@media (min-width: 1024px)` |
| Drawer slide-in <768px with hamburger | `MobileDrawerNav` client component renders; hamburger button visible; drawer has `aria-modal` |
| Nav items (role-gated Admin) | `getAppNavigation` filters Admin item when `role !== 'admin'` |
| Focus ring WCAG 2.1 AA | `focus-visible` outline ≥3px on all nav links (already in design system) |
| Top bar: breadcrumb + avatar + notification bell | `ShellTopBar` server component renders all three elements |

### Missing questions
None — criteria are fully derivable from the existing codebase and vision §2.5/§2.6.

### Pass
- Scope is clear
- All 5 acceptance criteria are testable
- No product blockers
