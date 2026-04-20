<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Tech Lead

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-18 — backlog-dependency-refinement

- **Did**: Added a technical dependency and gate analysis for the backlog, including the MVP critical path, ADR watchlist, and phase-specific release gates in a new spike and backlog update.
- **Why**: Implementation planning needed architecture and release constraints made explicit before the next sprint starts.
- **Learned**: The main technical risk concentration is around auth, OpenRouter compliance, document generation, payment ledger integrity, and interview latency.
- **Open**: ADR decisions are likely needed for email delivery, DOCX export, and possibly browser-extension implementation details.

## 2026-04-19 — US-005

- **Did**: Replaced the placeholder production Compose override with a Traefik-based reverse proxy setup, added HTTPS routing for `app`, `landing`, and `api`, documented the required production environment variables, and validated the merged stack with `docker compose ... config`, `pnpm lint`, and `pnpm test`.
- **Why**: Sprint `US-005` required a production-ready Docker override that stays aligned with the local stack while adding SSL termination and explicit deployment inputs.
- **Learned**: Compose needed `!override []` to fully clear inherited port mappings from the base file; otherwise services stayed directly published alongside Traefik.
- **Open**: Production still needs real deployment secrets and DNS records matching `APP_DOMAIN`, `LANDING_DOMAIN`, `API_DOMAIN`, and the optional Traefik dashboard host.

## 2026-04-19 — US-006

- **Did**: Closed the orchestrated workflow with a passing verdict after design-token implementation, review, and validation succeeded.
- **Why**: Sprint bookkeeping and architecture oversight require a clear final decision before the story can be considered complete.
- **Learned**: The shared UI package is now the correct place for cross-app theme primitives, reducing the risk of token drift in the next UI stories.
- **Open**: Future UI stories should keep reusing this token file instead of reintroducing app-local theme constants.

## 2026-04-19 — US-007

- **Did**: Accepted the shadcn-style helper adoption via `ADR-001`, closed the workflow with a passing verdict, and directed the next story to build navigation on the new shared primitives.
- **Why**: The project needed an explicit architecture decision and a final release-style gate before marking the story complete.
- **Learned**: The shared UI package can absorb additional component-library dependencies without breaking the monorepo quality gates.
- **Open**: The next UI stories should keep the responsive shell on top of the shared component layer to avoid duplicate navigation implementations.

## 2026-04-19 — US-008

- **Did**: Closed the responsive-navigation workflow with a passing verdict after shared-shell reuse, breakpoint behavior, and quality-gate evidence were all confirmed.
- **Why**: Sprint tracking and architecture governance require an explicit final decision before the story and sprint can be marked complete.
- **Learned**: The shared UI package is now the stable place for cross-app layout primitives, not just tokens and atomic components.
- **Open**: Upcoming authenticated dashboard work should extend this shell instead of introducing another layout abstraction.

## 2026-04-19 — smtp backend setup

- **Did**: Closed the ad hoc SMTP backend workflow with a passing verdict after confirming the env-driven, provider-neutral configuration module and successful workspace validation.
- **Why**: Architecture governance required an explicit final decision before the workflow state could be cleared and recorded.
- **Learned**: The backend can prepare for future email delivery without an ADR when no new library or framework is introduced and the implementation remains inside the existing Nest structure.
- **Open**: A future story should define the mailer service boundary and the auth/notification flows that will consume this config.

## 2026-04-19 — US-009

- **Did**: Closed the `US-009` workflow with a passing verdict after confirming the passwordless auth slice, secure cookie-session approach, and successful repository validation and coverage evidence.
- **Why**: Sprint bookkeeping and architecture governance require a clear final decision before the story can be marked complete.
- **Learned**: The current codebase can land a secure passwordless foundation without adding a new auth framework, which keeps future admin/bootstrap stories simpler.
- **Open**: The next auth-related story should integrate real email delivery on top of the existing SMTP and auth modules.

## 2026-04-19 — US-010

- **Did**: Closed the first-admin bootstrap workflow with a passing verdict after confirming persistent one-time admin assignment, later-signup safeguards, and successful repository validation.
- **Why**: Architecture governance and sprint bookkeeping require an explicit final decision before the story can be marked complete.
- **Learned**: The existing auth slice can safely own early bootstrap rules without introducing a new framework or violating the current architecture constraints.
- **Open**: The invitation and role-protection stories should now build on this persisted role authority instead of duplicating bootstrap logic.

## 2026-04-20 — US-011

- **Did**: Closed the invitation workflow with a passing verdict after confirming the persisted invitation model, end-to-end invitation acceptance flow, and successful lint/test validation.
- **Why**: Architecture governance and sprint bookkeeping require an explicit final decision before the story can be marked complete.
- **Learned**: The existing auth boundary is sufficient for invitation issuance and role assignment without any new framework or ADR; the next architecture step is centralized route authorization.
- **Open**: Repository-wide build stability still depends on cleaning stale `.next` artifacts that are currently owned by `nobody`.

## 2026-04-20 — US-012

- **Did**: Categorized `US-012` as a high-severity authorization gap in the app routing layer and documented that the sprint task currently points at a triage-only workflow.
- **Why**: The tech-lead stage needed to assign severity and root-cause area while checking whether the expected fix fits the current architecture.
- **Learned**: No ADR is needed for this work; the correct next step is to add route authorization on top of the existing signed-session contract.
- **Open**: The sprint metadata should be corrected to an implementation-capable workflow before engineering resumes.

## 2026-04-20 — US-012 finalization

- **Did**: Closed `US-012` with a passing verdict after confirming the route-protection implementation, regression coverage, and sprint completion, while recording the pre-existing app-build ownership issue as an environment advisory.
- **Why**: Sprint bookkeeping and architecture governance require an explicit final decision once the implementation and QA evidence are complete.
- **Learned**: The centralized signed-session contract is now strong enough to gate both candidate and admin routes without introducing a new framework or ADR.
- **Open**: The next admin-panel work can build directly on the guarded `/admin` route once the local `.next` ownership problem is cleaned up.

## 2026-04-20 — US-013 finalization

- **Did**: Closed `US-013` with a passing verdict after confirming the onboarding wizard implementation, tested draft-state slice, and successful lint/test gates, while preserving the known `landing` build-permission issue as an environment advisory.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once the implementation and QA evidence are complete.
- **Learned**: The existing authenticated shell can absorb a substantial mobile-first wizard without adding a new routing framework or state library.
- **Open**: `US-014` should formalize how onboarding output maps into the single editable base-profile model for MVP.

## 2026-04-20 — US-014 finalization

- **Did**: Closed `US-014` with a passing verdict after confirming the protected profile route, the single-profile storage rule, the coverage-complete profile slice, and successful lint/test gates.
- **Why**: Architecture governance and sprint bookkeeping require an explicit final decision before the story can be marked complete.
- **Learned**: The existing app boundary can carry the first base-profile domain locally without a new framework or ADR, which keeps the next pseudonymisation work focused on data handling rather than persistence redesign.
- **Open**: The repository still needs ownership cleanup on generated `.next` directories before build can be a reliable gate again.

## 2026-04-20 — US-015 finalization

- **Did**: Closed `US-015` with a passing verdict after confirming the prompt-safe contract, explicit local reinjection metadata, and successful lint/test/build evidence for the affected app slice.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once the policy is enforced in code and each acceptance criterion is verified.
- **Learned**: The existing app-layer profile boundary is a sufficient place to centralize pseudonymisation rules now, which reduces the risk of future OpenRouter integrations leaking forbidden fields through duplicated prompt builders.
- **Open**: The future AI service boundary should import this contract from one place instead of redefining prompt sanitization per feature.

## 2026-04-20 — US-016 finalization

- **Did**: Closed `US-016` with a passing verdict after confirming persisted consent metadata, shared critical-input guardrails, sprint `009` RGPD carry-over, and successful repo lint/test plus API build evidence.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once the implementation and QA stages show that the MVP guardrails are real and reviewable.
- **Learned**: The current auth and local-profile boundaries are sufficient to enforce meaningful RGPD preparation work now without an ADR or a wider persistence redesign.
- **Open**: The remaining launch-critical RGPD items are now explicitly queued in sprint `009`; the local app build still depends on fixing `.next` ownership outside the code change itself.

## 2026-04-20 — US-017 finalization

- **Did**: Closed `US-017` with a passing verdict after confirming the RGPD-safe OpenRouter module, 100% `src/ai` coverage, and all three acceptance criteria verified by dedicated unit tests.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off before the story can be marked complete.
- **Learned**: Encoding RGPD invariants as `const` spread values in the service (not runtime config) is the correct audit-friendly pattern for OpenRouter compliance; future AI services should follow this approach.
- **Open**: `OPENROUTER_BASE_URL` env override is acceptable for testing but warrants a future hardening note; US-018/US-019 should consume `OPENROUTER_SERVICE` token rather than constructing a parallel HTTP client.

## 2026-04-20 — US-018 finalization

- **Did**: Closed `US-018` with a passing verdict after confirming the new candidature-ingestion module, the protected `/candidatures` flow, repo-wide lint/test success, API build success, and explicit handling of the known app-build environment issue.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once implementation and QA evidence show that the feature is complete within the sprint scope.
- **Learned**: The current architecture can support early candidature creation by layering a thin file-backed draft store behind the API, which buys product momentum without committing the long-term persistence design prematurely.
- **Open**: `US-019` should add the text fallback on top of this same API boundary and avoid spreading extraction logic into the Next app.

## 2026-04-20 — US-019 finalization

- **Did**: Closed `US-019` with a passing verdict after confirming the shared URL-plus-text ingestion flow, successful lint/test/API-build evidence, and the explicit MVP deferral of PDF import.
- **Why**: Architecture governance and sprint bookkeeping require a final decision once the fallback path and the PDF scope stance are both evidenced in code and review artifacts.
- **Learned**: Deferring PDF import is the correct architectural call for MVP because the current candidature boundary has no safe file-ingestion path yet, while the text fallback already preserves product continuity.
- **Open**: `US-020` can now build the candidature status pipeline on a stable ingestion contract; `.next` ownership cleanup is still needed before app builds become a reliable local gate.

## 2026-04-20 — US-020 finalization

- **Did**: Closed `US-020` with a passing verdict after confirming the shared status contract, centralized API transition rules, persisted history, KPI summary endpoint, dashboard consumption, and passing lint/tests/API build.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once the MVP candidature pipeline exists in executable code and every acceptance criterion is verified.
- **Learned**: The correct architecture is to keep status semantics in the shared types package and treat the API as the only authority for transitions; the dashboard can then consume summary data without duplicating business rules.
- **Open**: The pre-existing `apps/app/.next` permission issue still needs cleanup before local app build can return as a clean release gate.

## 2026-04-20 — US-021 finalization

- **Did**: Closed `US-021` with a passing verdict after confirming the shared document schema, the full CV/LM block set, the single reusable registry for future admin and user flows, and successful `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once the reusable editor foundation exists in code and every acceptance criterion is explicitly verified.
- **Learned**: The right architecture is to keep block contracts in `packages/types` and block implementations plus registry metadata in `packages/ui`, which preserves a clean seam for future Puck integration.
- **Open**: `US-022` should consume this registry directly rather than introducing a second block-definition layer in the admin editor.
