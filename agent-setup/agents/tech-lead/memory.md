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

## 2026-04-20 — US-022 finalization

- **Did**: Closed out the workflow after confirming the implementation passed lint, tests, and build, then recorded the sprint completion artifacts.
- **Why**: The workflow needed a clear final verdict and next action for the sprint record.
- **Learned**: The templates slice is ready for the next product step: defaulting, duplication policy, and categorization.
- **Open**: None blocking for the current task.

## 2026-04-20 — US-023 finalization

- **Did**: Closed US-023 with a passing verdict after confirming all three acceptance criteria, the delete-with-constraint pattern in the service layer, the filter bar and inline action surface, and successful lint/test gates.
- **Why**: Architecture governance and sprint bookkeeping require a final sign-off once implementation and QA stages show the template management surface is complete.
- **Learned**: The delete-with-constraint pattern (last-template guard + default-transfer) is now established in the templates service and should be reused for any future entity with a one-default-per-group business rule.
- **Open**: US-024 should build the fictitious-data preview on top of the existing block registry without reopening the template storage or management contract.

## 2026-04-20 — Puck Editor integration audit

- **Did**: Verified whether Puck Editor (`@measured-co/puck`) is installed in the monorepo by scanning all `package.json` files and all source files for any reference to the package.
- **Why**: User asked the tech-lead to confirm or deny that Puck Editor is absent from the project.
- **Learned**: Puck Editor is **not installed anywhere** in the monorepo. The vision (§2 stack, §6, §7) mandates it as the single WYSIWYG editing layer for both admin template creation and user CV/LM editing, but zero dependency entries or imports exist today. The current block components in `packages/ui` were built as a foundation for future Puck integration (per US-021 memory note) but are not wired into Puck yet.
- **Open**: An ADR should be created before Puck integration begins, covering the chosen version, how Puck JSON is stored in PostgreSQL, and how the custom block registry is registered with `@measured-co/puck`. This is a hard prerequisite for the CV editing flow (US-025+).

## 2026-04-20 — ADR-003 Puck Editor integration

- **Did**: Authored and accepted ADR-003 covering Puck Editor integration across both the admin template creation surface and the user CV editing surface.
- **Why**: Both surfaces were built without `@measured-co/puck` during sprints 006–007. The admin has a raw JSON textarea in place of drag-and-drop; the user has a form-based editor. Both are critical product gaps that must be closed before the MVP ships.
- **Learned**: The existing `documentBlockRegistry` in `packages/ui` is already Puck-ready — a thin `toPuckConfig()` adapter is all that separates the current registry from a live Puck config. The main migration work is converting existing template JSON from `{ blocks: [] }` to Puck's native `{ content: [], root: {} }` format.
- **Open**: Two implementation stories are needed — one for admin drag-and-drop (replaces the textarea) and one for user Puck CV editor (replaces the form editor). Both require the `TemplateRecord.layout` type to be updated to Puck's `Data` type and the seed templates to be migrated before merging.

## 2026-04-20 — US-027 finalization

- **Did**: Closed `US-027` with a passing verdict after confirming the dedicated PDF export service, the app-side download route, the generic metadata title in the export HTML, and the targeted lint/test evidence for both app and API slices.
- **Why**: Sprint bookkeeping and release gating require an explicit tech-lead decision once the implementation and QA evidence are complete.
- **Learned**: Browserless `/pdf` with inline HTML is sufficient for the MVP export path as long as the service owns the template markup and the metadata stays generic.
- **Open**: `US-028` should reuse the same PDF export boundary for the letter of motivation rather than inventing a second export pipeline.

## 2026-04-20 — PDF export fallback fix

- **Did**: Added a local-host fallback for the Browserless PDF call and explicit service-unavailable handling so host-based dev no longer collapses into a generic 500 when `PUPPETEER_URL=http://puppeteer:3002` is unreachable outside Docker.
- **Why**: The user hit the CV download route from a host-based `localhost:3000` session and received `Internal server error`; the failing network lookup needed to become resilient in both Docker and non-Docker setups.
- **Learned**: The MinIO absence was not the immediate cause of the 500; the export path currently streams PDFs live and does not persist them yet.
- **Open**: If persistence is required by product scope, the next step is to add a real MinIO-backed PDF storage layer and signed download URLs.

## 2026-04-20 — US-028 finalization

- **Did**: Closed US-028 with a passing verdict after confirming the letter-generation path now reuses the same application and profile inputs as the CV flow, persists normalized LM content, and exposes an authenticated LM ATS editing surface.
- **Why**: Architecture governance and sprint bookkeeping require an explicit final sign-off once implementation and QA show the documentary pipeline extension is complete.
- **Learned**: Extending the existing document-generation module was the correct architectural move; it preserved one auditable pseudonymisation boundary and one application-backed document source of truth.
- **Open**: Sprint `007` should stay open until the known `apps/app/.next` permission issue and repo-wide app coverage debt are resolved well enough to satisfy sprint DoD.

## 2026-04-20 — US-055 finalization

- **Did**: Finalized US-055 workflow run; all stages passed, sprint checkbox ticked, ADR-003 updated with package rename note, state.json updated.
- **Why**: Sprint 008 foundational task complete — Puck infrastructure is in place for US-056 and US-057.
- **Learned**: `@measured-co/puck` is now `@puckeditor/core`. The sprint note about verifying compatibility was valid and should be treated as a required pre-check in future stories involving new packages.
- **Open**: US-056 (admin drag-and-drop) and US-057 (user CV editor) can start. Live migration script must run before either is deployed.

## 2026-04-21 — Sprint 008 DoD finalization

- **Did**: Closed the sprint-level validation workflow with a failing verdict, updated the sprint DoD checkboxes to reflect only the verified items, and recorded the failed result in project state.
- **Why**: Architecture and release governance require the sprint record to match the actual engineering gates, not the intended outcome.
- **Learned**: Sprint 008 feature scope is complete, but formal closure is still blocked by repo-level coverage debt and a broken root coverage invocation.
- **Open**: Sprint 008 should remain out of `completed_sprints` until the coverage gate is fixed and QA can issue a passing sprint-close review.

## 2026-04-21 — Sprint 008 DoD retry finalization

- **Did**: Closed the sprint-level retry workflow with a passing verdict, marked the remaining DoD checkboxes complete, and added Sprint 008 to `completed_sprints`.
- **Why**: Governance required one final explicit sign-off once the engineering blockers were actually fixed.
- **Learned**: The sprint-close path is now robust again because the root coverage command and the package-level tests agree on how coverage should be invoked.
- **Open**: None for Sprint 008.

## 2026-04-21 — US-029 finalization

- **Did**: Closed US-029 with a passing verdict after confirming the dedicated credit ledger, shared debit constants, AI-hook integration, and admin/user history endpoints, then updated sprint and workflow bookkeeping.
- **Why**: Architecture governance needed an explicit sign-off before Stripe and dashboard work reuse this ledger as the single balance source.
- **Learned**: The right architecture is an append-only credits module shared by the existing AI services, not duplicate balance fields across auth, applications, and payments.
- **Open**: US-030 should reuse `recordStripePurchase()` and avoid any second purchase-history persistence path.
