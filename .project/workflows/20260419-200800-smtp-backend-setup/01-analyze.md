# Stage 1 — Analyze

## Scope

Add a backend SMTP configuration slice in `apps/api` that:

- reads SMTP connection settings from environment variables
- keeps the setup provider-agnostic so Resend can be replaced later through env changes only
- is available to future mail-sending code through Nest dependency injection
- is covered by unit tests

## Acceptance Criteria

1. The backend exposes a typed SMTP configuration object derived from environment variables for server, port, user, and password.
2. The setup is provider-agnostic: Resend may be used through env values, but no provider-specific behavior is hard-coded into the backend implementation.
3. The repository documents the required SMTP environment variables in `.env.example`.
4. The API test suite covers the SMTP configuration parsing and the module wiring.

## Missing Product Questions

- None blocking for this setup task. The exact email-sending flow, sender identity, and delivery use cases remain future work.

## Pass Check

- Scope is clear: yes
- Acceptance criteria are testable: yes
- Missing product questions are listed: yes
