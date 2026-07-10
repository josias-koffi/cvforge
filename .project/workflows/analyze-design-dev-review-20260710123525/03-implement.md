---
tags: [workflow/stage, workflow/analyze-design-dev-review, stage/implement]
parent: "[[task]]"
agent: "[[../../../agent-setup/agents/developer/agent|developer]]"
prev: "[[02-design]]"
next: "[[04-review]]"
---
# Stage 3 — Implement (developer)

## Changes
- **New**: `apps/app/app/notifications/notification-groups.ts` — pure `groupNotificationsByDay(notifications, now)` helper. Buckets by calendar-day key (`today` / `yesterday` / `older`, UTC date comparison to stay deterministic in tests), omits empty buckets, sorts unread-first then most-recent within each bucket.
- **New**: `apps/app/app/notifications/notification-groups.test.ts` — 4 tests (bucketing, empty-bucket omission, unread-first sort, empty-list edge case).
- **Edited**: `apps/app/app/notifications/page.tsx` (319L → 352L, still under the 400L warning threshold):
  - Extracted the per-notification card markup (previously inline inside `.map()`) into a local `NotificationArticle` component — needed because it now renders inside a `.map()` nested one level deeper (day sections), and duplicating the JSX per section would have violated the active-refactoring "no new duplication" rule.
  - Replaced the flat `notifications.map(...)` in "Fil d'activité" with `daySections.map(...)` over `groupNotificationsByDay(notifications, new Date())`, rendering an `<h3>` day-bucket label above each group.
  - Moved the "Préférences email" `Card` to after "Fil d'activité" (was between the KPI row and the activity feed) and densified its two checkbox rows (single-line label + inline helper text instead of stacked `<span>`s, tighter `gap`).
  - Wrapped the unread-count `<strong>` with `aria-live="polite" role="status"` so future mark-as-read updates announce without re-reading the whole KPI card.
- **Edited**: `apps/app/app/notifications/page.test.tsx` — updated the existing render test to assert `aria-live="polite"` presence, that "Fil d'activité" now renders before "Preferences email" in the markup, and that unread-first ordering holds; added a new test asserting day-section headings render ("Plus ancien") and that empty buckets ("Aujourd'hui", "Hier") are omitted when no notification falls in them.

## Out of scope confirmed
- `read/route.ts`, `preferences/route.ts`, `summary/route.ts`, `notification-bell.tsx` — untouched, no contract change needed.

## Active refactoring (spec §9)
- No dead code introduced or found in touched files.
- `NotificationArticle` extraction eliminates the duplication that would otherwise appear once the same article markup needed to render inside a nested day-section loop.
- File size: `page.tsx` at 352L stays below the 400L JS/TS warning threshold; `notification-groups.ts` is a new 75L file.

## Quality gates
- `pnpm --filter app test -- notifications` and full `pnpm --filter app test`: **259/259 tests pass** (78 test files), including the 2 updated + 2 new notification tests.
- `pnpm --filter app lint`: 0 warnings/errors.
- `pnpm --filter app build`: succeeds; `/notifications` route bundle 1.42 kB (unchanged order of magnitude from before).

## Pass
- Code changes described above.
- Tests/lint/build all green — no blocking engineering issue.
- Coverage impact: touched files (`notification-groups.ts`, `page.tsx`) are both exercised by new/updated tests; no coverage regression expected on this slice.
- Active refactoring honored: no new duplication, no dead code, file size within target.
