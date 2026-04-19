# Stage 1 — Analyze

## Scope

Implement `US-009` with the smallest complete slice that matches the vision and current codebase:

- a working passwordless magic-link request and consume flow
- a secure persisted session after successful login
- explicit documentation of the current session-duration recommendation and the fact that product must still confirm the final value

This stage intentionally excludes first-admin bootstrap (`US-010`) and role-based route protection (`US-012`).

## Acceptance Criteria

1. The login passwordless flow works end to end from the app UI through magic-link consumption.
2. The resulting session is persisted securely.
3. The session duration is documented even though the final product value remains to be locked.

## Missing Product Questions

- The final session duration is still open in the vision. The implementation should therefore expose a documented default and keep it configurable.
- Real email delivery is not part of this story yet, so the flow may use a generated-link preview as long as the login contract is complete and future SMTP delivery can plug into it.

## Pass Check

- Scope is clear: yes
- Acceptance criteria are testable: yes
- Missing product questions are listed: yes
