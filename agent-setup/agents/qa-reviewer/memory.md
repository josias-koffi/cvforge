<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — QA Reviewer

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-19 — US-006

- **Did**: Reviewed the token-layer implementation against the sprint acceptance criteria and verified `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Why**: The task could only be marked complete once the design-system foundations and mobile-first behavior were evidenced in code and validation logs.
- **Learned**: The new token layer is fully covered by tests in the touched packages and does not introduce a blocking standards issue.
- **Open**: Accessibility automation is still a future repository-level gap, though this story does not fail on that basis.

## 2026-04-19 — US-007

- **Did**: Verified the new shared primitives, token usage, ADR coverage for the added libraries, and successful `pnpm lint`, `pnpm test`, and `pnpm build` runs against the sprint acceptance criteria.
- **Why**: The story could only pass once each acceptance criterion and every blocking engineering rule had concrete evidence.
- **Learned**: The new `@cvforge/ui` component layer stays above the coverage thresholds and preserves explicit accessibility affordances such as labels and visible focus styles.
- **Open**: Repo-level automated accessibility checks are still a future improvement, but this story passes the current blocking gates.

## 2026-04-19 — US-008

- **Did**: Reviewed the shared responsive shell implementation, verified each navigation acceptance criterion in code and tests, and confirmed `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- **Why**: The task could only be marked complete once the mobile and desktop navigation behavior had concrete implementation and validation evidence.
- **Learned**: The shared shell remains above coverage thresholds while adding semantic nav regions and active-state affordances.
- **Open**: Centralized automated accessibility checks remain a repo-level improvement outside this story.

## 2026-04-19 — smtp backend setup

- **Did**: Verified the SMTP configuration slice, env documentation, module wiring, and workspace quality-gate evidence, then recorded a passing review with no blocking findings.
- **Why**: The task could only pass once the backend configuration requirements and engineering standards had concrete test and build evidence.
- **Learned**: The API can add infrastructure-oriented setup work while staying above the project coverage thresholds and without introducing architecture drift.
- **Open**: The future delivery service still needs its own review once real email sending is added.

## 2026-04-19 — US-009

- **Did**: Reviewed the passwordless auth flow, verified each acceptance criterion against the new API and app code, and confirmed passing `pnpm lint`, `pnpm test`, and `pnpm build` plus coverage above the blocking thresholds for the touched packages.
- **Why**: The story could only pass once the login flow, secure session behavior, and session-duration documentation each had direct code and validation evidence.
- **Learned**: The generated-link preview is sufficient to validate the auth contract now without weakening the security or coverage gates for the story.
- **Open**: A later review should confirm the real email-delivery path once SMTP-backed sending is wired in.

## 2026-04-19 — US-010

- **Did**: Verified the one-time first-admin bootstrap behavior in code and tests, then confirmed passing `pnpm lint`, `pnpm test`, and `pnpm build` with API coverage above the blocking thresholds.
- **Why**: The task could only pass once each role-assignment criterion and the permanent bootstrap lock had direct evidence.
- **Learned**: The lightweight persisted store is sufficient for the current sprint so long as regression tests prove the bootstrap cannot be reused for later public signups.
- **Open**: The future user domain should replace file-backed persistence before multi-instance deployment becomes a requirement.

## 2026-04-20 — US-011

- **Did**: Verified admin-only invitation creation, one-time consumption, and 48-hour expiry in code and automated tests, then confirmed passing lint, package tests, and root `pnpm test`.
- **Why**: The task could only pass once each invitation acceptance criterion had direct evidence in the API and app flow.
- **Learned**: The invitation slice satisfies the current blocking standards, but the repository-wide `pnpm build` command is still exposed to stale `.next` artifacts owned by another user.
- **Open**: `US-012` should reuse the persisted role checks now present in the auth slice to protect `/admin` and other privileged routes.

## 2026-04-20 — US-012

- **Did**: Verified the new protected dashboard route, admin-only route, authorization redirect tests, workspace lint, root tests, and API build evidence, then recorded the remaining app-build ownership issue as a non-blocking environment advisory.
- **Why**: The story could only pass once each route-protection acceptance criterion had direct implementation and test evidence.
- **Learned**: The current auth slice now covers route-level authorization adequately for the sprint, even though local Next build stability is still affected by stale generated artifacts.
- **Open**: The stale `apps/app/.next` ownership should be cleaned under the correct user before relying on local app builds again.

## 2026-04-20 — US-013

- **Did**: Verified the onboarding wizard against the sprint criteria, confirmed passing `pnpm lint` and `pnpm test`, and recorded `@cvforge/app` coverage at `90.21%` lines with the onboarding slice at `92.03%`.
- **Why**: The task could only pass once each onboarding criterion and the project coverage gate had direct evidence.
- **Learned**: Separating wizard-state logic from static rendering keeps the client-heavy onboarding flow reviewable and testable without adding new tooling.
- **Open**: `pnpm build` remains subject to the pre-existing permission problem in `apps/landing/.next/trace`.

## 2026-04-20 — US-014

- **Did**: Verified the unique base-profile route, helper model, navigation updates, and coverage evidence; confirmed passing app and repo lint/tests; recorded the lingering build-permission issue as an environment advisory.
- **Why**: The task could only pass once each profile acceptance criterion and the new-code coverage bar had direct evidence.
- **Learned**: The touched profile slice can exceed the blocking coverage threshold even with a static client editor so long as the stateful helpers are isolated and tested thoroughly.
- **Open**: Build verification still depends on cleaning `.next` directories owned by another user before Next can regenerate artifacts.

## 2026-04-20 — US-015

- **Did**: Verified the new prompt pseudonymisation helper, confirmed explicit omission and reinjection evidence in tests, and rechecked `pnpm lint`, `pnpm test`, plus `pnpm --filter @cvforge/app build`.
- **Why**: The story could only pass once each RGPD acceptance criterion had direct code and validation evidence rather than a documentation-only promise.
- **Learned**: The pseudonymisation policy is easiest to review when it is expressed as a pure function with a stable result contract and a focused regression suite.
- **Open**: Any future decision to transmit public profile links to AI should be documented and reviewed explicitly instead of being added implicitly to prompt builders.

## 2026-04-20 — US-016

- **Did**: Verified consent collection on both signup surfaces, confirmed the new input-guard normalization path and sprint `009` RGPD carry-over, and rechecked `pnpm lint`, `pnpm test`, plus `pnpm --filter @cvforge/api build`.
- **Why**: The story could only pass once each acceptance criterion and the standards coverage gate had direct evidence in code, tests, and sprint documentation.
- **Learned**: Consent is easiest to audit when it is enforced twice: first in the Next routes for UX clarity, then again in the Nest auth service for integrity.
- **Open**: `pnpm --filter @cvforge/app build` is still blocked by the pre-existing `.next` ownership issue and remains an environment advisory rather than a product defect.

## 2026-04-20 — US-017

- **Did**: Verified all three acceptance criteria against test evidence (12 service tests + 6 config tests), confirmed `pnpm --filter api lint` and `pnpm --filter api test` pass with 100% `src/ai` line/branch coverage and 89.88% overall statements.
- **Why**: The story could only pass once each ZDR, prompt-logging, and provider invariant had direct test-level proof rather than a code inspection alone.
- **Learned**: RGPD invariants are easiest to audit when they are `const` spread values rather than conditional defaults, because each test can assert the exact body shape without mocking config.
- **Open**: The `useFactory` in `openrouter.module.ts` is not covered by a module-integration test (same gap as `SmtpModule`); advisory only.

## 2026-04-20 — US-018

- **Did**: Verified the authenticated offer-import flow, structured extraction payload, and explicit failure handling in code and automated tests; rechecked `pnpm lint`, `pnpm test`, `pnpm --filter @cvforge/api build`, and the new-slice coverage thresholds.
- **Why**: The story could only pass once every acceptance criterion and the blocking new-code coverage rule had direct evidence.
- **Learned**: The candidature-ingestion slice clears the coverage gate once the supporting config/store/module paths are tested, not just the main service path.
- **Open**: `pnpm --filter @cvforge/app build` is still blocked by the pre-existing `.next` ownership problem and remains an environment advisory.

## 2026-04-20 — US-019

- **Did**: Verified the new pasted-text fallback path, confirmed the explicit PDF MVP defer decision, and rechecked lint, repo tests, API build, plus touched-slice coverage evidence.
- **Why**: The task could only pass once both the executable fallback and the PDF scope decision had concrete evidence instead of remaining as a sprint note.
- **Learned**: The fallback decision is reviewable when the UI, API, and workflow summary all express the same product stance rather than splitting it between code and docs.
- **Open**: `pnpm --filter @cvforge/app build` remains blocked by the pre-existing `.next` ownership issue and should not be misread as a regression from this story.

## 2026-04-20 — US-020

- **Did**: Verified the five-status candidature pipeline, server-side transition enforcement, timestamped history, dashboard summary endpoint, passing lint, passing focused tests with coverage above spec, and passing API build; recorded the known app-build permission issue as an advisory only.
- **Why**: The story could only pass once each acceptance criterion was evidenced in code and tests, and once the remaining build failure was clearly separated as an environment issue rather than a feature defect.
- **Learned**: The status model is reviewable when transitions are enforced centrally in the API and surfaced in the UI through allowed-next-action controls rather than free-form editing.
- **Open**: The local `apps/app/.next` ownership problem still needs cleanup before app build can be restored as a reliable gate.

## 2026-04-20 — US-021

- **Did**: Verified the shared CV/LM block library, the normalized document-schema contract, the admin/user reuse evidence from the registry tests, and successful `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Why**: The task could only pass once each acceptance criterion and the new-code coverage threshold had direct evidence in code and automated validation.
- **Learned**: The registry-based approach makes reuse reviewable because the same metadata can be asserted for both an admin palette and a user-facing render path.
- **Open**: `US-022` should preserve this single source of truth when the real Puck admin editor is introduced.

## 2026-04-20 — US-022 review

- **Did**: Reviewed the templates admin slice after implementation, confirmed the seeded CV/LM templates, the create/edit/duplicate editor surface, and the JSON persistence path.
- **Why**: The sprint needed a final pass that checked the acceptance criteria against the shipped code and the executed gates.
- **Learned**: The Puck-compatible editor keeps the shared block registry as the rendering source of truth while meeting the MVP goal.
- **Open**: No blocking issues remained after lint, tests, and build.

## 2026-04-20 — US-023 review

- **Did**: Verified all three acceptance criteria (duplication UX, category management, default designation per type), confirmed all blocking engineering standards pass, and identified three non-blocking advisory items.
- **Why**: The story could only pass once each acceptance criterion had direct code evidence and the new route handlers cleared the 90% new-code coverage threshold.
- **Learned**: The gold `Défaut` badge contrast ratio at #C8A96E on #FAFAF7 just clears 4.5:1 WCAG AA — margin is thin; any future palette adjustment should recheck this.
- **Open**: The `window.confirm` pattern and the page line count are advisory items to address in the next admin UX pass.

## 2026-04-20 — US-025 review

- **Did**: Verified all three acceptance criteria: (1) prompt RGPD compliance via service test assertions on the OpenRouter payload, (2) `CVDocumentContent` compatibility with the block registry contract, (3) local field re-injection confirmed by service test and CV render page.
- **Why**: The story could only pass once every acceptance criterion had direct automated test evidence covering the RGPD-critical path.
- **Learned**: The pseudonymisation contract is reviewable when expressed as two distinct types (`PromptSafeProfile` vs `CvLocalFields`) — the type system prevents accidentally sending `localFields` to OpenRouter.
- **Open**: US-026 should preserve the `cvContent` contract when adding Puck editing so that re-generation and editing can coexist without breaking the stored document structure.

## 2026-04-20 — US-028 review

- **Did**: Verified the mirrored LM pipeline against the sprint criteria, confirmed the same pseudonymised prompt shape and application-derived offer context, and rechecked `@cvforge/api` tests/lint/build plus `@cvforge/app` tests/lint.
- **Why**: The task could only pass once the LM flow had direct evidence for source reuse, default ATS template rendering, and RGPD consistency with the CV path.
- **Learned**: The LM story is reviewable because the same service boundary now owns both documents; the only meaningful difference is the normalized output schema and user-facing editor surface.
- **Open**: `@cvforge/app build` is still blocked by the pre-existing `.next` permission issue, and app-wide coverage remains below the repo target because of older uncovered surfaces outside this task.

## 2026-04-20 — US-055 review

- **Did**: Verified all 5 acceptance criteria for US-055, confirmed 289 monorepo tests pass, checked coverage (100% on `puck-config.ts`), and issued one advisory on ADR-003 package name.
- **Why**: All acceptance criteria required evidence before the task could be ticked.
- **Learned**: Package renames between ADR authoring and actual installation are a real risk. The advisory pattern (update ADR, don't block) is the right response for a name-only discrepancy with no API change.
- **Open**: US-056 introduces `<Puck>` client component — the SSR guard (`next/dynamic` with `ssr: false`) must be verified during that review.

## 2026-04-21 — Sprint 008 DoD review

- **Did**: Reviewed Sprint 008 closure evidence, confirmed the three task-level reviews still stand, reran `pnpm test`, and issued a failing sprint-level QA verdict because the app package remains below the blocking coverage line threshold.
- **Why**: A sprint-close approval cannot ignore the engineering-spec coverage gate even when every task acceptance criterion has already passed.
- **Learned**: Repo-level sprint closure can fail even when all underlying stories pass individually, because the DoD introduces aggregate gates that must be checked again at the sprint boundary.
- **Open**: Re-run the review after the root coverage command is fixed and `@cvforge/app` reaches at least 80% line coverage.

## 2026-04-21 — Sprint 008 DoD retry review

- **Did**: Re-ran the sprint-close QA review after the coverage fixes, confirmed the root coverage command succeeds, and issued a passing verdict with all five DoD items verified.
- **Why**: The sprint needed a final QA decision based on current evidence, not on the earlier failed review.
- **Learned**: The repaired coverage workflow and the new focused tests were enough to move the sprint from blocked to complete without reopening any acceptance criteria.
- **Open**: None for Sprint 008.

## 2026-04-21 — US-029 review

- **Did**: Verified the new credit ledger, debit rules, and user/admin history endpoints against the sprint criteria, then confirmed `@cvforge/api` targeted tests, lint, and build all pass.
- **Why**: The story could only pass once each acceptance criterion had explicit code and validation evidence, especially around the debit amounts and the traceability fields.
- **Learned**: The ledger is reviewable because every balance change records both the delta and the resulting `balanceAfter`, which makes later user/admin history screens straightforward to audit.
- **Open**: US-030 still needs webhook-level review once Stripe purchase events start writing into the ledger.
