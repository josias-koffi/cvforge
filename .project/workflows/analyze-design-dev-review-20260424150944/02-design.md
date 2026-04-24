# Design

The UX is intentionally minimal and non-decorative: one interview workspace card for controls/status and one card for the rolling transcript plus chunk log.

Design decisions:
- keep the existing authenticated `AppShell`
- show session id, chunk count, and state badges for observability
- persist the active session id in `sessionStorage` so a refresh can resume the same transcript
- expose three explicit actions: start/resume, stop, and reset
- surface backend/provider failures inline while keeping the session recoverable

Accessibility and UX risks are explicit:
- microphone permission failure becomes inline error text
- transcript stays in a read-only textarea for keyboard and screen-reader friendliness
- no VAD or animated feedback yet; that remains US-046
