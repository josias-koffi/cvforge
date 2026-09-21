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
- Status: not needed as things stand. Interview audio is never written to disk — segments are transcribed in flight and dropped — so there is no object to purge. Sessions and their transcript segments are purged 30 days after completion by `InterviewPurgeService`, and immediately on account deletion (US-092). This plan applies only if audio storage is ever introduced.

## Notes

- The product does not persist interview audio, by design rather than by omission: the report is built from the transcript alone (docs/interview-practice.md).
- The browser-local base profile and onboarding draft are cleared client-side when the user confirms account deletion.
