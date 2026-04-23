Design direction is intentionally narrow and accessibility-safe:

- Add a privacy page under the existing `/profile` area instead of inventing a new settings shell.
- Keep two primary actions visible above the retention policy:
  - download personal-data export,
  - destructive account deletion with strong confirmation by exact email match.
- Present retention rules as stacked cards with plain language and one highlighted audio-purge plan block.

Non-UI design decisions:

- The API owns server-side export/deletion for auth, candidatures, credits, and notifications.
- The browser augments the export with the local base profile and clears both base-profile and onboarding-draft storage keys on deletion.
- If a deleted admin is referenced in other users' business records, those references are anonymized to `[deleted-account]` instead of deleting unrelated records.

UX risks addressed:

- destructive action is irreversible and requires explicit email confirmation;
- export is available before deletion;
- retention wording stays factual and tied to current MVP behavior.

Pass verdict: the design fits the analyzed scope; no extra UI system or accessibility risk was introduced.
