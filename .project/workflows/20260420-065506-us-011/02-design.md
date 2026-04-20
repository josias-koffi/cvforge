# Stage 2 — Design

## UX Shape

This story is mostly backend/auth behavior, but it needs one user-facing screen to keep the invitation link consumable:

- invitation links open a dedicated app page, not the generic login page
- the page shows the invited email, target role, and the 48-hour expiry
- the only primary action is "accept invitation", which posts the token to the API
- success redirects to the existing login-success page that already verifies the signed session

## Admin Surface

- no standalone admin dashboard is introduced yet
- invitation creation remains API-first and admin-gated
- this keeps the implementation aligned with the later `/admin` story instead of shipping a throwaway UI

## Accessibility Notes

- invitation page uses semantic heading, descriptive text, and a single button
- no new custom interaction patterns are introduced
- error states must remain textual and visible

## Pass Verdict

Pass. The proposed design fits the analyzed scope and explicitly treats the missing admin panel as a deliberate non-goal.
