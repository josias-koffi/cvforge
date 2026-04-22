US-033 maps directly to vision `§13.2`: the MVP needs a protected admin user-management surface, not a new domain. Scope is clear and testable: deliver a paginated/filterable `/admin` user list, expose manual credit grants with a mandatory note, and prove every grant is stored in the existing ledger.

Key product decisions:
- Reuse the current auth account store as the user source of truth.
- Reuse the existing credits ledger as the audit trail for manual grants.
- Keep the task limited to admin listing and credit operations; invitation creation, suspension, and RGPD deletion stay for later stories.

Missing product blockers: none. The acceptance criteria are executable with the current backend and admin route foundation.
