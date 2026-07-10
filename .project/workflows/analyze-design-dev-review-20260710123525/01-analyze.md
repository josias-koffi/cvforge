---
tags: [workflow/stage, workflow/analyze-design-dev-review, stage/analyze]
parent: "[[task]]"
agent: "[[../../../agent-setup/agents/product-owner/agent|product-owner]]"
prev: null
next: "[[02-design]]"
---
# Stage 1 — Analyze (product-owner)

## Scope confirmed
US-076 is a pure UI reflow of the existing `/notifications` page: change the ordering/grouping of an already-fetched flat notification list and reposition the already-shipped "Préférences email" card. No new API endpoint, no new notification type, no new data field is required — `readAt` and `createdAt` (already on `InAppNotification`) are sufficient to derive both the unread-first ordering and the day buckets (aujourd'hui / hier / plus ancien) client-side (well, server-side, since the page is already an RSC).

## Acceptance criteria — testability mapping
1. **Tri décroissant + non-lu en tête + pastille** — sortable in the existing `fetchNotifications()` result: partition by `readAt == null`, then sort each partition by `createdAt` descending, unread first. "Pastille visible" = the existing unread `Badge` variant, kept.
2. **Groupement par jour** — bucket by comparing `createdAt`'s calendar date (Europe/Paris local date, matching existing `formatDate` locale) against today/yesterday, else "Plus ancien". Needs a small pure helper (testable in isolation).
3. **Carte Préférences email en pied de liste, format dense** — move the existing card markup after the notification list instead of before it; "dense" means tightening the two checkbox rows/copy, not a new component.
4. **Lien candidature conservé** — `notification.linkHref` already renders as an anchor; no change to that contract, just verify it survives the reorder.
5. **WCAG: `aria-live` sur compteur non-lu + focus visible** — the unread count currently renders as a plain `<strong>`; needs `aria-live="polite"` (or a wrapping region). Focus visible already comes from the shared `Button`/form primitives — verify no custom disable of `:focus-visible` was introduced.

## Out of scope
- No change to `read/route.ts`, `preferences/route.ts`, or `summary/route.ts` contracts.
- No change to `notification-bell.tsx` (shell header accessory, unrelated to this page body).
- No new notification types beyond the two already delivered (US-035 in-app, US-041 email).

## Product decisions
- None required — the AC and design source doc (`frontend-rationalization-20260709.md` §8) are specific enough to implement directly; no `AskUserQuestion` needed for this task.

## Pass
- Scope is clear: reorder/regroup an existing list + reposition an existing card, both derivable from already-persisted fields.
- Every acceptance criterion above is directly testable in code/tests.
- No missing product questions.
