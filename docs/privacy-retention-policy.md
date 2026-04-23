# Privacy Retention Policy

Date: 2026-04-23
Scope: Sprint `010` / `US-036`

## MVP rules

- Account identity, candidatures, notifications, and owned credit entries are retained only while the account is active.
- A confirmed self-service deletion request removes those owned records immediately.
- Passwordless magic links expire after 15 minutes or earlier once consumed.
- Invitation links expire after 48 hours or earlier once consumed.
- If an admin deletes their account, third-party business records stay intact but the admin reference is anonymized to `[deleted-account]`.

## Audio purge plan

- Interview audio files and derived transcripts will be retained for 30 days once audio storage is shipped.
- The purge will run automatically every day at 03:00 UTC.
- The purge scope covers MinIO audio objects plus any stored transcript artifacts tied to those interviews.
- Status: planned for the interview-audio delivery scope before commercial launch of that feature.

## Notes

- The current MVP does not yet persist interview audio, so the purge remains a documented implementation plan rather than active runtime behavior.
- The browser-local base profile and onboarding draft are cleared client-side when the user confirms account deletion.
