# Review

Verdict: ✅ pass

Acceptance criteria:
- `La cloche avec badge est présente dans le header`
  Verified by the shared `AppShell` header accessory and the new `NotificationBell` mounted on authenticated pages.
- `Les notifications in-app sont listées avec statut lu/non lu`
  Verified by `/notifications`, unread-first feed ordering, explicit `Non lue` / `Lue` badges, and the mark-as-read flow.
- `Les rappels de candidature (J+7) sont déclenchés`
  Verified by `NotificationsService`, which creates one persisted follow-up reminder when a candidature remains `sent` for 7 days.

Blocking findings: none.

Evidence:
- App tests green
- API tests green
- App/API lint green
- App/API builds green
- Root coverage run green and above project floor
