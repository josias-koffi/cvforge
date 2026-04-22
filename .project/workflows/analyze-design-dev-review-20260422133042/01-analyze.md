# Analyze

US-035 stays inside vision `§12.4` and `§14`: deliver one in-app notification center plus the MVP follow-up reminder rule only. The reminder scope is explicit and testable: create an in-app reminder at J+7 for a candidature still in `sent` without any later response status.

Acceptance mapping:
- Header bell with badge: visible on authenticated `AppShell` pages.
- In-app list with read/unread: dedicated `/notifications` page with status badge and mark-as-read action.
- J+7 reminders: generated from candidature status history, persisted, and exposed through API/app routes.

No blocker remains on scope. Email preferences, interview reminders, low-credit alerts, and admin-triggered product notifications stay out of this story.
