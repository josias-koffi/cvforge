<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Product Owner

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-18 — backlog-dependency-refinement

- **Did**: Tightened `sprints/backlog.md` with an estimate scale, dependency matrix, technical gates, and an ADR watchlist, then added a delivery dependency spike.
- **Why**: The roadmap needed execution-oriented constraints before starting the next implementation sprint.
- **Learned**: The MVP critical path is narrower than the full roadmap and depends heavily on locking auth, pseudonymisation, and template infrastructure in the right order.
- **Open**: Provider email, session duration, and DOCX tooling still need explicit product decisions.

## 2026-04-19 — US-006

- **Did**: Confirmed the design-token story scope, acceptance criteria interpretation, and the absence of product blockers before implementation started.
- **Why**: `US-006` needed a precise boundary so the design-system work stayed limited to tokens and base-shell foundations already present in the vision.
- **Learned**: The vision is specific enough to define the first token set without adding new product requirements.
- **Open**: `US-007` still needs to translate these tokens into reusable `shadcn/ui` primitives.

## 2026-04-19 — US-007

- **Did**: Confirmed that `US-007` stays limited to shared base components in `packages/ui` and that the acceptance criteria can be verified through exports, rendered markup, and quality-gate evidence.
- **Why**: The workflow needed a clear product boundary before introducing the shadcn-style component layer.
- **Learned**: The existing vision and sprint criteria are precise enough to implement the first shared primitive set without inventing any new user flows.
- **Open**: `US-008` should now consume these primitives instead of creating navigation-specific UI styles from scratch.

## 2026-04-19 — US-008

- **Did**: Confirmed that `US-008` is strictly a shared-shell navigation story and that its acceptance criteria can be evidenced through shared UI code, breakpoint rules, and rendered markup.
- **Why**: The workflow needed a tight product boundary before turning the base shell into responsive app and landing navigation.
- **Learned**: The vision already implies a reusable shell pattern, so no extra product scope was needed to support both marketing and authenticated surfaces.
- **Open**: The next dashboard stories should populate this shell with real authenticated sections and data.

## 2026-04-19 — smtp backend setup

- **Did**: Framed the SMTP backend task as an ad hoc workflow item, defined testable acceptance criteria around env-driven configuration, and documented that the `US-003` reference does not match the current backlog.
- **Why**: The workflow needed a precise product boundary before implementation so the work stayed limited to backend configuration rather than inventing a full email-delivery feature.
- **Learned**: The requested outcome can be delivered as provider-neutral infrastructure with Resend only serving as the initial SMTP example.
- **Open**: Future product work still needs explicit decisions for sender identity, magic-link delivery behavior, and notification use cases.

## 2026-04-19 — US-009

- **Did**: Confirmed that `US-009` is limited to the passwordless login contract itself, defined the acceptance boundary around a working magic-link flow plus secure sessions, and captured the still-open product decision on final session duration.
- **Why**: The workflow needed a precise scope so implementation could deliver auth fundamentals without spilling into first-admin bootstrap or role-based authorization.
- **Learned**: The vision allows the sprint to ship with a configurable recommended session duration while keeping the exact final value as a product follow-up.
- **Open**: Real email delivery still needs to be connected to the existing SMTP setup in a future story.

## 2026-04-19 — US-010

- **Did**: Confirmed that `US-010` is strictly the one-time first-admin bootstrap inside the existing passwordless flow and kept invitations and route protection out of scope.
- **Why**: The workflow needed a product boundary that made each acceptance criterion directly testable without inventing extra admin features.
- **Learned**: The vision requires persistent bootstrap state; otherwise the first-admin guarantee would not survive a restart.
- **Open**: `US-011` still needs a separate invitation mechanism rather than extending public signup semantics.

## 2026-04-20 — US-011

- **Did**: Confirmed that `US-011` stays limited to admin-generated nominative invitations with 48-hour expiry and a consumable invitation-specific registration path.
- **Why**: The workflow needed a strict boundary so the story would deliver invitation mechanics without prematurely building the full admin panel or broader user-management flows.
- **Learned**: The vision is precise enough to ship the invitation contract now while keeping `/admin` protection and admin UI for the next story.
- **Open**: `US-012` still needs to protect the future admin surface and centralize authorization checks.

## 2026-04-20 — US-012

- **Did**: Prioritized the confirmed authorization gap to remain in sprint `003` and documented that the task cannot be completed through the currently assigned `bug-triage` workflow.
- **Why**: The product-owner stage needed an explicit sprint decision and a clear next action once triage confirmed the gap.
- **Learned**: The story scope still matches the vision, but the workflow metadata does not match the delivery work required.
- **Open**: Reassign `US-012` to an implementation workflow, then rerun it.

## 2026-04-20 — US-012 implementation

- **Did**: Reframed `US-012` under the implementation workflow with explicit acceptance mapping for a protected dashboard route, an admin-only route, and tested authorization behavior.
- **Why**: The rerun needed a scope definition that stayed inside the vision while turning the previously triaged gap into implementable work.
- **Learned**: The story can be completed without inventing the full admin panel by shipping a minimal `/admin` surface plus route guards.
- **Open**: The future admin-panel story can now build on the guarded route instead of starting from a public surface.

## 2026-04-20 — US-013

- **Did**: Confirmed that `US-013` stays limited to the first-login onboarding wizard, mapped the five vision steps to testable acceptance criteria, and kept the editable base-profile scope for `US-014`.
- **Why**: The workflow needed a strict product boundary before implementation so the story would deliver onboarding value without inventing the full profile domain too early.
- **Learned**: The vision is explicit enough to ship the wizard now while deferring full AI-backed profile enrichment and editing flows to the next sprint tasks.
- **Open**: `US-014` should define how these onboarding fields seed the single editable base profile in MVP.

## 2026-04-20 — US-014

- **Did**: Confirmed that `US-014` is limited to one editable base profile in MVP, mapped the nine vision sections to concrete acceptance evidence, and kept duplication, deletion, and favorite actions out of scope.
- **Why**: The workflow needed a strict product boundary so the story delivers a usable profile source without prematurely opening the multi-profile roadmap.
- **Learned**: The current onboarding output is sufficient to seed a first base-profile experience without inventing backend persistence that belongs to later user-domain work.
- **Open**: `US-015` now needs to define exactly which profile fields are withheld or transformed before AI prompt construction.

## 2026-04-20 — US-015

- **Did**: Confirmed that `US-015` is limited to a reusable pseudonymisation contract for future AI prompts, mapped the forbidden fields from vision `§15.3`, and kept real OpenRouter integration out of scope.
- **Why**: The workflow needed a precise product boundary so the story could be completed now without inventing the later CV/LM/interview delivery pipelines.
- **Learned**: The vision is explicit enough to define a testable prompt-safe payload plus a local reinjection plan before any remote AI call exists in the codebase.
- **Open**: The future generation stories should decide whether public profile links need their own documented transmission policy.

## 2026-04-20 — US-016

- **Did**: Reframed `US-016` under the implementation workflow, limited the scope to signup consent, critical input guardrails, and sprint `009` RGPD carry-over, then confirmed the open legal/operational items stay out of sprint `004`.
- **Why**: The declared `bug-triage` workflow could not satisfy the story acceptance criteria; the rerun needed a product boundary that remained faithful to vision `§15.1` and `§15.5`.
- **Learned**: The current MVP can ship meaningful RGPD guardrails now without pretending that the legal texts and DSAR operations are already delivered.
- **Open**: Sprint `009` still needs to close the documented RGPD launch blockers before commercialization.

## 2026-04-20 — US-017

- **Did**: Confirmed that `US-017` is limited to a NestJS `OpenRouterModule` with three hard-coded RGPD invariants (`zdr: true`, `transforms: []`, `provider: Mistral only`), with no UI or prompt-building scope.
- **Why**: The workflow needed a precise scope so the story could be completed without prematurely designing the full AI generation pipeline.
- **Learned**: The three acceptance criteria map directly to auditable constants in the service code, which makes future compliance reviews straightforward.
- **Open**: Future AI generation stories (US-018, US-019) should import `OPENROUTER_SERVICE` instead of constructing direct HTTP clients.

## 2026-04-20 — US-018

- **Did**: Scoped `US-018` to an authenticated URL-ingestion flow with server-side scraping, structured extraction into a persisted draft candidature, and explicit error states for invalid, unreachable, or unusable offers.
- **Why**: The workflow needed a tight MVP boundary that satisfies vision `§7.3` without prematurely opening manual fallback, PDF import, ATS generation, or status-pipeline scope.
- **Learned**: The wording "creer une candidature" needs a persisted draft record rather than a transient preview to remain product-coherent.
- **Open**: `US-019` should add the manual text fallback and decide whether PDF fallback is worth the MVP cost.

## 2026-04-20 — US-019

- **Did**: Confirmed that `US-019` adds the manual text fallback on the existing candidature flow and formally deferred PDF fallback for MVP with documented rationale.
- **Why**: The workflow needed a product decision that preserved the vision path without forcing a risky file-ingestion scope into the sprint.
- **Learned**: Vision `§16` makes URL plus text fallback sufficient for MVP candidature creation, while PDF import remains a later enhancement.
- **Open**: `US-020` should now focus only on the status pipeline, not on ingestion completeness.

## 2026-04-20 — US-020

- **Did**: Reframed `US-020` under the implementation workflow override, locked the candidature pipeline to the five vision statuses, and defined KPI-ready scope around total applications, counts by status, and response rate.
- **Why**: The task could only be implemented safely once the status model and acceptance evidence were constrained to the vision instead of growing into the full candidature sheet or dashboard roadmap.
- **Learned**: The vision is precise enough to implement the MVP status lifecycle now without inventing backward transitions or extra states.
- **Open**: A future dashboard story can extend visualizations and ATS metrics on top of the new status-summary contract rather than re-deciding the status model.

## 2026-04-20 — US-021

- **Did**: Confirmed that `US-021` is limited to the shared CV/LM block library and normalized content contract, while keeping full Puck editor integration in `US-022`.
- **Why**: The workflow needed a strict product boundary so the current story could deliver reusable building blocks without prematurely opening admin CRUD or storage scope.
- **Learned**: The vision cleanly separates custom document blocks from the later template-management story, which made the acceptance criteria directly testable.
- **Open**: `US-022` now needs to attach these blocks to the admin template editor and persistence model.

## 2026-04-20 — US-023 analyze

- **Did**: Confirmed US-023 scope: activation toggle, category management UX, default badge, delete-with-constraint, and filter bar. Duplication backend was already complete from US-022; the story focused on surface and UX gaps.
- **Why**: The workflow needed a precise product boundary so no scope from US-024 (preview with fictitious data) was pulled in.
- **Learned**: The vision §6.7 and §13.3 are complete enough to derive all six management actions without inventing new requirements.
- **Open**: US-024 should define how fictitious data is injected into the live preview.

## 2026-04-20 — US-022 analyze

- **Did**: Confirmed the admin template story needs seeded CV ATS and LM ATS templates, a create/edit admin editor, and JSON persistence in the API.
- **Why**: The workflow needed a product-level scope check before implementation so the acceptance criteria stayed testable.
- **Learned**: The sprint can land as a Puck-compatible admin studio on top of the shared document block registry without expanding the vision.
- **Open**: `US-023` should handle default selection, duplication policy, and categorization as the next product slice.

## 2026-04-20 — US-024 analyze

- **Did**: Confirmed US-024 scope as a pure preview enhancement: fixture injection into the existing TemplatePreview, no real data or generation pipeline scope.
- **Why**: The workflow needed a tight boundary so the story did not bleed into the AI generation or user-edit flows.
- **Learned**: The vision explicitly separates admin preview (fictitious data) from user preview (real generated content), which made the acceptance criteria directly testable.
- **Open**: Sprint 006 complete. Sprint 007 should tackle CV generation pipeline.

## 2026-04-20 — US-025 analyze

- **Did**: Confirmed US-025 scope as the core CV generation pipeline: pseudonymised prompt → OpenRouter → JSON → local re-injection → stored CVDocumentContent, with frontend trigger and render page.
- **Why**: The workflow needed a precise boundary separating this story from US-026 (Puck editing), US-027 (PDF export), and US-028 (LM generation).
- **Learned**: The profile lives in localStorage (app-side); the API must receive the pseudonymised payload and inject sensitive fields server-side — this is the correct RGPD-compliant architecture.
- **Open**: US-026 should add WYSIWYG Puck editing on top of the generated CVDocumentContent that US-025 now stores per-application.

## 2026-04-20 — US-028 analyze

- **Did**: Confirmed that US-028 must mirror the CV documentary flow for a motivation letter attached to the same candidature, using the same prompt-safe profile input and the same application-derived offer context.
- **Why**: The workflow needed a precise product boundary so the LM story would extend the existing document pipeline instead of creating a second architecture.
- **Learned**: Vision `§9` is specific enough to define the LM JSON structure, ATS default template order, and the attachment-to-candidature constraint without any extra product decisions.
- **Open**: Sprint `007` can only be fully closed once the repo-wide app coverage/build environment is cleaned up.

## 2026-04-20 — US-055 analyze

- **Did**: Confirmed US-055 scope as the Puck infrastructure story: install `@puckeditor/core`, create `toPuckConfig()` adapter, migrate `TemplateRecord.layout` type, write migration script, and keep all existing registry tests green.
- **Why**: The workflow needed a precise product boundary separating this foundational story from US-056 (admin drag-and-drop) and US-057 (user editor).
- **Learned**: The npm package name changed from `@measured-co/puck` to `@puckeditor/core`. The sprint blocker note was prescient — always verify package names before declaring scope.
- **Open**: US-056 and US-057 can now start. The migration script must be run against any live templates-state.json before deploying either story.

## 2026-04-21 — Sprint 008 DoD

- **Did**: Validated the Sprint 008 closure scope against the completed US-055/056/057 artifacts and confirmed which DoD items are objectively evidenced.
- **Why**: Sprint closure required a product-level decision based on explicit verification rather than assuming the sprint was complete once the task boxes were checked.
- **Learned**: The sprint value is delivered, but the repo-wide coverage gate still blocks formal sprint completion.
- **Open**: Sprint 008 should be revalidated once the app coverage floor and root coverage command are fixed.

## 2026-04-21 — Sprint 008 DoD retry

- **Did**: Revalidated Sprint 008 after the test and coverage fixes and confirmed that every DoD item now has explicit passing evidence.
- **Why**: The sprint could only be closed once the previously failing engineering gates were rechecked, not assumed.
- **Learned**: The sprint scope was already complete; the closure delay came entirely from repo-level quality gate drift.
- **Open**: None for Sprint 008.

## 2026-04-21 — US-029 analyze

- **Did**: Confirmed that US-029 is limited to the backend credit ledger, AI debit rules for existing OpenRouter-backed actions, and history/read APIs needed by the upcoming Stripe and credits-page stories.
- **Why**: The workflow needed a precise product boundary so the story would not spill into Stripe checkout or the "Mes credits" UI planned in US-030 and US-031.
- **Learned**: Vision `§11.4` and `§11.6` are specific enough to derive the MVP debit rules now: offer enrichment `1`, CV generation `3`, and letter generation `3`.
- **Open**: US-030 should connect confirmed Stripe purchases to the same ledger instead of creating a second balance source.

## 2026-04-21 — US-030 analyze

- **Did**: Confirmed that US-030 is limited to Stripe-hosted checkout for the two fixed packs, webhook-based crediting into the existing ledger, and basic purchase entry/error handling from the authenticated app surface.
- **Why**: The workflow needed a precise product boundary so the story would not spill into the full credits-history page deferred to US-031.
- **Learned**: Vision `§11.5` and `§11.6` are specific enough to derive the exact MVP SKU set now: `Starter` (`€9.99`, `550` credits) and `Pro` (`€19.99`, `1400` credits).
- **Open**: US-031 should reuse the same pack definitions and ledger purchase metadata for the user-facing credits history.

## 2026-04-22 — US-031 analyze

- **Did**: Confirmed that US-031 is limited to the authenticated "Mes crédits" page, reusing the existing ledger summary for balance, history, and low-balance warning rather than adding a new billing model.
- **Why**: The workflow needed a precise scope so the story stayed inside vision `§11.7` and `§14.1` without drifting into the later notification-center or expanded dashboard work.
- **Learned**: The existing backend contract from US-029 and US-030 is already sufficient for this page; the remaining gap was discoverability and presentation in the app.
- **Open**: US-032 should complete the dashboard-access pattern around this new credits surface.

## 2026-04-22 — US-032 finalization

- **Did**: Closed US-032 after verifying 7 visible base KPIs, quick-access entry points, and the recent-applications list on the authenticated dashboard; then updated sprint and workflow records.
- **Why**: Sprint scope required the first usable dashboard entry point promised in vision `§12.1` to `§12.4` and roadmap `§16`.
- **Learned**: The MVP dashboard scope is strongest when it stays anchored to current product data already present in applications and credits, instead of waiting for later ATS and interview analytics stories.
- **Open**: Future dashboard iterations can add ATS averages and interview-score trends once those metrics exist as first-class product data.

## 2026-04-22 — Sprint 009 closure

- **Did**: Finalized Sprint 009 after the audit and coverage gates were evidenced, and marked the sprint complete in project state.
- **Why**: Product governance requires the sprint record to reflect actual validated completion, not just feature implementation.
- **Learned**: The sprint now closes cleanly because the dashboard story completed the engagement loop and the quality gates are explicitly satisfied.
- **Open**: Future roadmap work can extend the dashboard with richer analytics once those datasets exist.

## 2026-04-22 — US-033 analyze

- **Did**: Confirmed that US-033 is limited to the first usable admin users-and-credits panel on `/admin`, with server-side filtering/pagination and manual credit attribution anchored to the existing ledger.
- **Why**: The workflow needed a tight product boundary so the story would not spill into later admin actions such as suspension, deletion, analytics, or invitation management.
- **Learned**: Vision `§13.2` is precise enough to ship the MVP admin register now by reusing the auth account store and credit ledger already in place.
- **Open**: US-034 should extend the admin area with template analytics and exports without reopening the user-management contract.

## 2026-04-22 — US-034 analyze

- **Did**: Confirmed that US-034 is limited to completing the admin templates panel with visible analytics, CSV export, and fully operational template-management actions around the existing editor flow.
- **Why**: The workflow needed a precise product boundary so the story would not drift into future user-side template selection or broader admin dashboard work.
- **Learned**: Vision `§13.3` is specific enough to require real usage analytics, not static placeholders, so the implementation should persist minimal template-usage metadata from document generation.
- **Open**: US-035 can proceed independently once the admin templates analytics/export slice is closed.

## 2026-04-22 — US-035 analyze

- **Did**: Confirmed that US-035 is limited to one in-app notification center plus the MVP J+7 follow-up reminder for candidatures still marked as sent without response.
- **Why**: The workflow needed a precise product boundary so the story would not spill into email preferences, interview reminders, or later notification types.
- **Learned**: Vision `§12.4` and `§14` are specific enough to derive a testable reminder rule and a concrete notification-center entry point without inventing extra product scope.
- **Open**: US-036 can proceed independently once this in-app notification slice is closed.
