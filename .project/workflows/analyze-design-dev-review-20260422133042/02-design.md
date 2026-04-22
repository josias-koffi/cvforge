# Design

Design direction: keep notifications in the existing authenticated shell rather than inventing a second header pattern. Add a compact bell pill in the `AppShell` hero topline so the entry point stays visible across dashboard, profile, candidatures, credits, admin, and document pages.

Notification center UX:
- Route: `/notifications`
- Feed: card list ordered unread-first, then newest-first
- Status: explicit `Non lue` / `Lue` badges
- Actions: open linked candidature, mark unread items as read

Reminder behavior:
- Source of truth stays server-side
- J+7 follow-up reminders are derived from candidature status history (`sent`) and persisted idempotently
- Link target goes back to the candidature pipeline so the user can act immediately

Accessibility risk is low: the bell has an explicit aria-label, status is text-based, and actions remain standard links/forms.
