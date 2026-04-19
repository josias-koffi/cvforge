# Task

- Workflow: `analyze-design-dev-review`
- Run ID: `20260419-201909-us-009`
- Sprint: `003`
- Task: `US-009`
- Source: `.project/sprints/sprint-003.md`
- User request: `$sprint 003 US-009`
- Normalized task: Implement passwordless authentication with a working magic-link flow, secure persisted sessions, and explicit documentation of the session lifetime decision point.

## Acceptance Criteria

1. The passwordless login works end to end.
2. Sessions are persisted securely.
3. The session duration is documented, even if the final value still needs confirmation.

## Notes

- This story covers the auth flow itself, not the first-admin bootstrap (`US-010`) or role-based route protection (`US-012`).
- The vision allows either JWT or a secure session cookie after magic-link validation; this implementation uses a signed, expiring session cookie.
