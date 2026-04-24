# Stage 1 — Analyze

Agent: product-owner
Verdict: passed

`US-041` extends the existing in-app notifications slice into multichannel delivery without inventing a second notification domain. The vision requires email reminders plus per-type email preferences; the repository already had two concrete delivery moments available in code: candidature follow-up reminders (`J+7` after `sent`) and confirmed Stripe credit purchases. These are the essential email notifications that can be delivered now with direct evidence.

Scope is therefore:

- keep the existing notification center as the in-app anchor;
- add persisted user-level email preferences;
- send email for due follow-up reminders and confirmed credit purchases;
- reuse the already chosen SMTP/provider configuration instead of adding a new mail framework.

Out of scope for this story:

- interview reminders (`J-1`, `H-2`), because the current application model has no interview datetime to schedule against;
- new product notification types not yet backed by real events in the codebase.
