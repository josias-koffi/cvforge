# Stage 2 — Design

## Design Decision

This story spans backend auth behavior plus a minimal frontend flow, so the design output focuses on the narrow UX needed to prove the passwordless contract without inventing later dashboard or admin surfaces.

## Implementation Shape

- Add an `auth` module to `apps/api` with:
  - magic-link issuance
  - single-use magic-link consumption
  - signed, expiring session cookies
  - a session inspection endpoint for the app
- Keep the auth implementation dependency-light and inside the existing Nest structure; no new auth framework or ADR-worthy library is required for this sprint slice.
- Add a minimal Next flow in `apps/app`:
  - `/login` request form
  - `/login/check-email` preview of the generated magic link
  - `/login/success` session verification page after the API consumes the link
- Document the session duration through env vars and user-facing copy, with a recommended default of `7` days that remains configurable.

## UX / Accessibility Notes

- The login form uses a real label and semantic form controls.
- The generated-link page makes the temporary email-preview behavior explicit so the prototype does not misrepresent current delivery capabilities.
- No new role-protected UI is added here; `/admin` remains a later story.

## Pass Check

- Proposed design fits the analyzed scope: yes
- UX risks or non-UI skip decision are explicit: yes
