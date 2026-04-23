# Implement

Delivered changes:

- Replaced the single-profile storage helper with a migration-safe profile registry plus per-candidature profile selection helpers
- Updated `/profile` to manage multiple profiles, switch the active profile, and edit the selected profile in the existing form
- Added a candidature-level profile selector and wired CV/LM generation buttons to the selected profile instead of the old singleton
- Updated privacy export copy to reflect browser-local profile registry export
- Added regression tests for legacy migration, registry persistence, and candidature profile selection

Validation:

- `pnpm --filter @cvforge/app test` ✅
- `pnpm --filter @cvforge/app build` ✅
- `pnpm --filter @cvforge/app lint` ✅

Coverage impact: touched app paths remain covered by targeted tests; no new dependency or ADR was required.
