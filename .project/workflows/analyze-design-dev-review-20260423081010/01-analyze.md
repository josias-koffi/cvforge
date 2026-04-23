`US-036` stays within vision `§15.1` and `§15.5`: ship one authenticated GDPR access/deletion path and make retention decisions explicit before launch. The acceptance criteria are testable if the implementation provides:

1. an export JSON reachable by the authenticated user,
2. an irreversible self-service delete flow that removes owned records,
3. documented retention rules plus an explicit audio-purge plan.

Key scope decision: the base profile is still browser-local, so the app must merge it into the export and clear it on deletion. No legal-text authoring, DPO decision, or Stripe/OpenRouter contractual work is pulled into this story.

Open questions resolved by assumption for this sprint:

- account-owned records are retained only while the account stays active;
- magic links keep their existing 15-minute TTL;
- invitation links keep their existing 48-hour TTL;
- future interview audio will be retained 30 days with a daily purge job once that feature ships.

Pass verdict: scope is clear and all three criteria are directly verifiable.
