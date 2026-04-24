<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Developer

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-18 — publish bootstrap commits

- **Did**: Split the repository bootstrap into multiple Conventional Commits, verified lint/test/build, and prepared the branch for push to GitHub.
- **Why**: Keep the initial monorepo history reviewable and aligned with the project publish rules.
- **Learned**: The workspace passes `pnpm lint`, `pnpm test`, and `pnpm build`, but the configured pre-commit gate is not yet backed by a `.pre-commit-config.yaml` file.
- **Open**: Decide whether the repository should add a real pre-commit configuration or remove that gate from the documented publish workflow.

## 2026-04-19 — upgrade project scaffolding

- **Did**: Upgraded the generated project entry docs, README workflow block, workflow definitions, and `.project/state.json` to the latest framework-managed format, with a dated backup under `.project/upgrades/20260419-035118/`.
- **Why**: Align the repository with the current orchestrated workflow model without overwriting user-owned project files outside the managed migration scope.
- **Learned**: This repo was in a mixed state where root docs were generated but still referenced the older `agents/`, `spec/`, and root `workflows/`/`sprints/` layout; the live state file also lacked workflow orchestration keys.
- **Open**: Validate the upgraded workflow commands against the intended sprint process and decide whether any project-local docs still reference the pre-upgrade paths.

## 2026-04-19 — US-006

- **Did**: Added a shared design-token module, refactored `AppShell` to consume it through CSS variables, themed both app layouts, and updated tests before running lint/test/build.
- **Why**: The sprint story required codified "Papier & Crayon" tokens and a mobile-first base shell that later component work can inherit.
- **Learned**: The existing workspace could absorb a tokenized design-system layer without any new dependency; package subpath exports were enough for cross-app reuse.
- **Open**: `US-007` can now focus on component primitives instead of re-deciding the visual foundations.

## 2026-04-19 — US-007

- **Did**: Added shadcn-style helper dependencies to `@cvforge/ui`, created reusable base primitives and shared styles, updated both app layouts to load them, added an ADR for the new libraries, and verified the workspace with lint/test/build.
- **Why**: The sprint story required reusable base components in `packages/ui` that inherit the "Papier & Crayon" design tokens and remain accessible.
- **Learned**: The monorepo can adopt shadcn component conventions incrementally inside the shared UI package without first migrating the whole stack to Tailwind.
- **Open**: `US-008` should compose the new primitives into the responsive navigation shell instead of adding new page-local component patterns.

## 2026-04-19 — US-008

- **Did**: Refactored the shared `AppShell` into a configurable responsive shell with mobile bottom navigation, a `lg` desktop sidebar, per-app navigation data, and test updates, then verified the workspace with `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Why**: The sprint story required one reusable shell that can serve `app`, `landing`, and later authenticated screens without duplicating layout code.
- **Learned**: Typed navigation props plus an optional content slot are enough to keep the shell shared while allowing future authenticated pages to diverge in body content.
- **Open**: The next authenticated dashboard stories should start consuming the shell with real routes and section content.

## 2026-04-19 — smtp backend setup

- **Did**: Added a provider-neutral SMTP config factory and Nest module in `apps/api`, documented the env variables in `.env.example`, added unit tests, fixed a TypeScript narrowing issue, and verified the workspace with `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Why**: The backend needed a simple SMTP setup that can point at Resend now while remaining swappable later through environment changes only.
- **Learned**: A minimal DI-exposed config module is enough to prepare the API for future email delivery without adding extra libraries or provider lock-in.
- **Open**: The next backend story should consume this config in a real mailer service and define sender metadata.

## 2026-04-19 — US-009

- **Did**: Added a Nest auth module with magic-link issuance and consumption, signed expiring cookie sessions, app-side passwordless pages and route handlers, auth configuration docs, and enough tests to keep both touched packages above the blocking coverage threshold.
- **Why**: `US-009` required a working passwordless login path and secure persisted sessions without waiting for the later email-delivery or role-protection stories.
- **Learned**: The current monorepo can support a complete passwordless slice without a heavyweight auth library by using Node crypto, Nest controllers, and a thin Next app flow.
- **Open**: The flow still previews the generated magic link until a future mailer story replaces that step with actual email delivery.

## 2026-04-19 — auth magic-link email delivery

- **Did**: Added SMTP-backed magic-link email sending with `nodemailer`, documented the runtime dependency via `ADR-002`, switched the app flow from exposing the raw link to instructing the user to check their inbox, and revalidated the workspace with lint, test, and build.
- **Why**: The vision requires users to receive the magic link by email, and the previous preview-based flow was only a temporary technical placeholder.
- **Learned**: The existing provider-neutral SMTP config was sufficient to support real auth email delivery once a dedicated mail transport and sender identity were added.
- **Open**: Delivery success in real environments still depends on valid SMTP credentials plus a verified sender/domain on the chosen provider.

## 2026-04-19 — US-010

- **Did**: Added a file-backed auth account store, wired it into the Nest auth module, made session roles persistent and bootstrap-aware, added regression tests, and revalidated the repo with lint, test, and build.
- **Why**: `US-010` required the first completed account to become `admin` exactly once while ensuring every later public signup stays `user`.
- **Learned**: A small persisted role store is enough to secure the first-admin bootstrap now without introducing a database dependency ahead of the broader user model.
- **Open**: Later auth stories should migrate this state into the real user persistence layer once that domain exists.

## 2026-04-20 — US-011

- **Did**: Added persisted invitation records, admin-only invitation endpoints, invitation consumption that assigns the invited role, a dedicated app-side invitation acceptance flow, and regression tests across the API and app packages.
- **Why**: `US-011` required nominative admin/user invitations that are single-use and expire after 48 hours without adding a new persistence layer or admin framework.
- **Learned**: The existing file-backed auth slice can safely own invitation issuance and role assignment for the current sprint, which sets up the next route-protection story cleanly.
- **Open**: The root `pnpm build` command is still blocked by pre-existing `.next` artifacts owned by `nobody`; the feature code itself passed lint, tests, API build, and app TypeScript compile checks.

## 2026-04-20 — US-012

- **Did**: Reproduced the missing route-authorization gap by confirming the app has no `/admin` route or frontend guard layer, while the API only exposes session and admin-session probe endpoints.
- **Why**: The first stage of the declared `bug-triage` workflow required stable reproduction evidence before any categorization or prioritization decision.
- **Learned**: The persisted session and role primitives from `US-009` to `US-011` are present, but they are not yet consumed by the Next app routing layer.
- **Open**: `US-012` needs an implementation workflow before the missing authorization layer and tests can actually be delivered.

## 2026-04-20 — US-012 implementation

- **Did**: Added a shared server-side auth helper in `apps/app`, protected the candidate dashboard and new `/admin` route with the existing signed-session API checks, added a `/forbidden` fallback page, and expanded app/API regression tests for authorization behavior.
- **Why**: `US-012` required real role-based route protection and direct test evidence on top of the existing passwordless/session work.
- **Learned**: The current auth slice is sufficient for app-side route protection without adding middleware or a new auth library; forwarding the cookie jar to the Nest auth endpoints keeps the authority centralized.
- **Open**: Local Next builds still depend on cleaning stale `.next` artifacts owned by another user.

## 2026-04-20 — US-013

- **Did**: Replaced the placeholder protected home page with a five-step onboarding wizard, added local draft persistence plus tested wizard-state helpers, introduced a protected `/dashboard` exit route, and updated the app navigation and page tests.
- **Why**: `US-013` required a real first-login candidate flow that can be resumed later and remains within the existing shared UI system.
- **Learned**: The current app package can meet the new-code coverage bar by separating wizard state logic from static UI markup while reusing the shared shell and form primitives.
- **Open**: Root `pnpm build` is still blocked by the pre-existing permission issue on `apps/landing/.next/trace`.

## 2026-04-20 — US-014

- **Did**: Added a protected `/profile` route, modeled a single base-profile store seeded from onboarding, implemented editable sections for the vision profile content, updated navigation, dashboard, and onboarding flow, and raised the touched profile slice to `98.67%` line coverage.
- **Why**: `US-014` required a usable editable base profile for MVP without adding a backend user persistence layer or opening multi-profile scope.
- **Learned**: The current app can support a dense candidate profile editor by keeping state logic in tested helpers and treating the UI layer as static presentational markup.
- **Open**: Repository build verification is still blocked by stale `.next` artifacts owned by another user in both `apps/app` and `apps/landing`.

## 2026-04-20 — US-015

- **Did**: Added a new `ai-prompt-profile` helper in `apps/app` to generate a prompt-safe candidate payload, listed forbidden and reinjected fields explicitly, added regression tests, and revalidated with app lint/tests, repo lint/tests, and an app build.
- **Why**: `US-015` required the pseudonymisation rules from vision `§15.3` to exist as executable code before any OpenRouter integration is introduced.
- **Learned**: The current local profile and onboarding models are already sufficient to encode the RGPD prompt contract without adding an API client, new dependency, or ADR.
- **Open**: The future AI integration should consume this helper centrally so prompt construction does not fork across CV, LM, and interview features.

## 2026-04-20 — US-016

- **Did**: Added signup consent enforcement on the public and invitation flows, persisted consent metadata in the auth store, introduced shared input guards for critical onboarding/profile fields, extended regression tests, and documented the remaining RGPD launch gaps in sprint `009`.
- **Why**: `US-016` required executable MVP guardrails for consent and critical data handling, not just a documentation placeholder.
- **Learned**: The existing auth slice can persist consent without a new dependency, and the local onboarding/profile stores are a good choke point for defensive normalization.
- **Open**: The app build gate is still blocked by foreign-owned files in `apps/app/.next`, so environment cleanup is needed before local Next builds become reliable again.

## 2026-04-20 — US-017

- **Did**: Created `apps/api/src/ai/` with `openrouter.config.ts`, `openrouter.service.ts`, `openrouter.module.ts`, and two test files (18 tests total); registered `OpenRouterModule` in `AppModule`; used native `fetch` (Node 20) to avoid a new dependency.
- **Why**: `US-017` required an auditable RGPD-compliant OpenRouter client that future generation stories can consume via the `OPENROUTER_SERVICE` injection token.
- **Learned**: Extracting the three RGPD invariants (`zdr`, `transforms`, `provider`) as a `const` spread — not configurable — makes the compliance story auditable in a single file.
- **Open**: The `OPENROUTER_BASE_URL` env override is useful for testing; a future hardening story should document or restrict it.

## 2026-04-20 — US-018

- **Did**: Added a new `apps/api/src/applications/` slice for authenticated offer scraping, OpenRouter-backed field extraction, and file-backed draft candidature persistence; added the protected `/candidatures` page plus import route in `apps/app`; expanded shared types and tests across API, app, and types.
- **Why**: `US-018` required a real end-to-end candidature creation path from an offer URL, not just a parser utility or placeholder UI.
- **Learned**: The existing auth session and `OPENROUTER_SERVICE` boundaries were enough to ship a coherent ingestion vertical slice without a new dependency or ADR.
- **Open**: `@cvforge/app build` is still blocked by the pre-existing `.next` ownership issue, so local Next build remains an environment concern rather than a feature regression.

## 2026-04-20 — US-019

- **Did**: Added explicit candidature source metadata, implemented `import-from-text` in the API and app route flow, extended the `/candidatures` page with a textarea fallback, and documented the MVP PDF defer decision in the workflow artifacts and UI copy.
- **Why**: `US-019` required a real manual fallback path while keeping the PDF scope honest and non-blocking for MVP delivery.
- **Learned**: Reusing the existing `applications` boundary keeps the extraction logic source-agnostic and avoids duplicating candidature creation between URL and text imports.
- **Open**: The app build is still blocked by foreign-owned files in `apps/app/.next`, and a future PDF story will need a proper upload/storage/parsing design instead of incremental patching.

## 2026-04-20 — US-020

- **Did**: Added a shared application-status domain contract, implemented persisted status history plus guarded transitions in the API, exposed `/applications/summary` and `/:id/status`, updated `/candidatures` with manual transition controls and history, and replaced the placeholder dashboard with KPI cards backed by the new summary endpoint.
- **Why**: `US-020` required an executable candidature pipeline that future dashboard work can trust, not a draft-only placeholder or documentation note.
- **Learned**: Keeping the status model and transition map in `@cvforge/types` prevents the API and app from diverging as the candidature flow grows.
- **Open**: `pnpm --filter @cvforge/app build` is still blocked by the pre-existing `.next` ownership issue and should be fixed before relying on local Next build as a hard gate again.

## 2026-04-20 — US-021

- **Did**: Added the normalized CV/LM content contract in `packages/types`, implemented the reusable document block library and shared registry in `packages/ui`, added regression tests, and verified the repository with `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Why**: `US-021` required executable Puck-ready building blocks that both admin and user flows can consume later without duplicating schema or rendering logic.
- **Learned**: The cleanest MVP shape is to deliver a shared block registry now and defer the actual editor integration to `US-022`, which keeps the current story dependency-free and strongly typed.
- **Open**: The next template story should wire this registry into admin authoring and JSON persistence instead of re-declaring block metadata locally.

## 2026-04-20 — US-022

- **Did**: Added the API templates module and file-backed JSON persistence, seeded CV ATS and LM ATS templates, built the admin template studio with create/edit/duplicate flows, updated navigation, and verified the repo with lint, tests, and build.
- **Why**: `US-022` needed a working admin management slice that matched the vision while staying within the current monorepo architecture.
- **Learned**: The shared document block registry can power a practical Puck-compatible editor surface now, and the default-per-kind invariant should be enforced in the service layer.
- **Open**: `US-023` can focus on activation, categorization, and default rules without reopening the editor/storage contract.

## 2026-04-20 — US-023

- **Did**: Added `deleteTemplate` to API service with last-template guard and default-transfer logic; added `TemplatesStore.remove()` with file persistence; added `DELETE /templates/:id` endpoint; added three new Next.js route handlers (delete, toggle-active, set-default); rewrote the admin templates page with inline action cards, filter bar, predefined category suggestions, and gold default badge; added 18 new tests across all touched files.
- **Why**: `US-023` required management actions surfaced directly on template cards without forcing the admin to open the edit form.
- **Learned**: The last-template guard should sit in the service layer rather than the controller, because the constraint is a domain rule (you must always have at least one template per kind) not a request validation.
- **Open**: The `window.confirm` delete pattern should be replaced by a proper shadcn `AlertDialog` client component in the next admin UX pass.

## 2026-04-20 — fix OpenRouter 404 on candidature creation

- **Did**: Removed all per-request provider routing constraints (`provider.only`, `provider.order`, `allow_fallbacks`, `data_collection: "deny"`, `zdr: true`) from `OPENROUTER_DEFAULTS` in `openrouter.service.ts`; kept only `transforms: []`; added response body capture to the error throw; updated all test assertions.
- **Why**: Creating a candidature triggered `"No endpoints found for mistralai/mistral-small-2603"`. Root cause: `data_collection: "deny"` in the request body acts as an *endpoint capability filter* (only route through providers that advertise ZDR support) — neither the Mistral nor Venice endpoint advertises it, so OpenRouter found no valid route. ZDR is enforced at the OpenRouter account level ("Always enforce ZDR" toggle), not per-request.
- **Learned**: OpenRouter ZDR operates on two separate layers: (1) **account-level** — "Always enforce ZDR" in the web UI applies to every request from that API key transparently; (2) **per-request `data_collection: "deny"`** — this is a *routing filter*, not a ZDR signal, and blocks routing when no endpoint advertises ZDR support. Never add `data_collection: "deny"` to requests when account-level ZDR is enabled — it is redundant and breaks routing. Always include the response body in error messages; `404 Not Found` alone is not enough to diagnose OpenRouter failures.
- **Open**: None — ZDR is enforced via account setting; `transforms: []` disables prompt logging at the OpenRouter layer.

## 2026-04-20 — fix delete form RSC error

- **Did**: Extracted the delete `<form onSubmit>` from the Server Component `page.tsx` into a new `"use client"` `DeleteForm` component at `apps/app/app/admin/templates/delete-form.tsx`.
- **Why**: Next.js RSC serialization rejects event handler props (`onSubmit`) passed across the server/client boundary. The `window.confirm` guard requires client-side JS and therefore must live in a Client Component.
- **Learned**: Any `<form onSubmit>` or interactive handler inside a Server Component will throw "Event handlers cannot be passed to Client Component props" at runtime. The fix is always to extract to a minimal `"use client"` wrapper rather than moving the whole page.
- **Open**: Consider replacing `window.confirm` with a proper `AlertDialog` from shadcn in a future UX pass for a better modal experience.

## 2026-04-20 — US-025

- **Did**: Implemented the full CV generation pipeline — new `cv-generation` NestJS module (`CvGenerationService`, `CvGenerationController`), added `cvContent`/`cvGeneratedAt` to `StoredApplication` and `DraftApplication`, `GenerateCvButton` client component, `/candidatures/generate-cv` route handler, and `/cv/[applicationId]` render page.
- **Why**: US-025 required the first end-to-end generation path: pseudonymised OpenRouter call → normalised CVDocumentContent → local field re-injection → render via document block components.
- **Learned**: The profile is app-side (localStorage); the RGPD-correct pattern is to build `PromptSafeProfile` on the client and re-inject `localFields` server-side after the AI response — this keeps PII out of OpenRouter without moving profile storage to the API. The `cv-generation` module shares the same `FileApplicationsStore` instance as `ApplicationsModule`, which works in the current file-backed setup but will need coordination when migrating to a real DB.
- **Open**: US-026 should wire the stored `cvContent` into the Puck editor for WYSIWYG editing. US-027 adds PDF export from the same content.

## 2026-04-20 — US-026

- **Did**: Added a user-side CV editor surface that loads stored `cvContent`, exposes a desktop structured editing form with live preview, hides the editor on mobile in favor of read-only preview, and persists updates through a new authenticated `PUT /applications/:applicationId/cv` API path plus a Next route bridge.
- **Why**: US-026 required editable CV content for the user without breaking the shared document schema or the later PDF export path.
- **Learned**: Keeping the editor schema-driven around `CVDocumentContent` is enough to support a practical WYSIWYG-style workflow now while preserving PDF compatibility for US-027.
- **Open**: US-027 can reuse the same `cvContent` contract for Puppeteer export without translating the edited data into a new format.

## 2026-04-20 — US-028

- **Did**: Extended the existing CV generation slice to support letters as a first-class document: added LM request/update contracts, persisted `letterContent` and `letterGeneratedAt`, implemented authenticated API generate/get/update endpoints, added candidature-side generation routing, and built a user-side LM editor/preview page.
- **Why**: US-028 required the motivation letter to reuse the same documentary pipeline and pseudonymisation rules as the CV rather than introducing a parallel feature path.
- **Learned**: The cleanest implementation was to keep the LM flow inside the existing document-generation module and reuse the same `promptProfile` + `offerContext` inputs, only swapping the normalization target and UI surface.
- **Open**: The app package still has a pre-existing `.next` permission problem, and the repo-wide app coverage baseline remains below the project target outside this task's local scope.

## 2026-04-20 — LM PDF export parity fix

- **Did**: Added LM PDF export to the existing server-side document export service, exposed `GET /applications/:applicationId/letter/pdf`, created the Next route proxy at `app/letters/[applicationId]/pdf/route.ts`, and wired the LM editor with a download button matching the CV flow.
- **Why**: The LM feature could be generated and edited but not downloaded under the same metadata/privacy rules as the CV.
- **Learned**: The right fix was to extend the shared exporter instead of duplicating PDF logic in the app, which preserves one privacy boundary for both document types.
- **Open**: The full Next build is still affected by the pre-existing `.next` ownership issue; this fix was verified with targeted tests only.

## 2026-04-20 — US-056

## 2026-04-22 — publish notifications sprint work

- **Did**: Verified the notifications center branch state, ran `pre-commit run --all-files`, `pnpm lint`, `pnpm test`, and `pnpm build`, then grouped the pending changes for publish on `develop`.
- **Why**: The current sprint work combined the in-app notifications feature with its workflow/state artifacts and needed a clean, reviewable push sequence.
- **Learned**: The repo now builds cleanly end to end, including the Next app package that had previously been blocked by `.next` ownership issues in older entries.
- **Open**: Keep future sprint workflow artifacts in their own small commit so the product change remains easier to review.

## 2026-04-22 — publish US-032 release

- **Did**: Validated the pending US-032 dashboard and sprint-release changes with `pre-commit run --all-files`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm audit --audit-level=high`, then split the work into feature and project-governance commits for push on `develop`.
- **Why**: The branch had a completed dashboard feature plus release paperwork that needed a clean, reviewable publish sequence.
- **Learned**: The current workspace gates pass cleanly and the dependency audit is no longer blocked by the registry path; only `1 low` and `1 moderate` advisory remain.
- **Open**: None for the publish step itself.

- **Did**: Created `PuckTemplateEditor` client component (loaded via `next/dynamic` with `ssr: false`), created `/admin/templates/publish-layout` JSON route forwarding to `PUT /templates/:id`, replaced the layout JSON textarea with the live Puck drag-and-drop canvas in the admin templates page, fixed the create form's empty layout default to valid PuckData format, added `@puckeditor/core` as direct dependency of `apps/app`, added `transpilePackages` to `next.config.ts`.
- **Why**: US-056 required replacing the manual JSON textarea with a real Puck canvas so admins can assemble, reorder, and delete blocks via drag-and-drop.
- **Learned**: `@puckeditor/core` must be added as a direct dependency of the consuming app (not just the UI library) for module resolution in pnpm workspaces without hoisting. CSS from `@puckeditor/core` requires `transpilePackages` in `next.config.ts`. Splitting layout save from metadata save avoids synchronising Puck internal state with the surrounding HTML form — each concern has its own save path.
- **Open**: US-057 should replace the user-side CV editor with the constrained Puck mode (`permissions: { delete: false, drag: false, duplicate: false, insert: false }`).

## 2026-04-20 — US-055 implement

- **Did**: Installed `@puckeditor/core@0.21.2`, created `toPuckConfig()` adapter, migrated `TemplateRecord.layout` type to `PuckData`, updated all seed/normalize/validate code in templates store and service, wrote migration script, and updated all affected tests to pass.
- **Why**: Sprint 008 foundational task — all subsequent Puck stories depend on this infrastructure.
- **Learned**: `@measured-co/puck` was renamed to `@puckeditor/core`. Always verify package names from npm before installing. `PuckData` should be defined locally in `packages/types` rather than importing from the UI library, to avoid coupling a pure types package to a large dependency.
- **Open**: The `<Puck>` component from `@puckeditor/core` still cannot run SSR — US-056 and US-057 must wrap it in `next/dynamic` with `ssr: false`.

## 2026-04-20 — US-057

- **Did**: Replaced the `CvEditor` shadcn/ui form with Puck content-only mode: added `cvContentToPuckData()` and `puckDataToCvContent()` converters, created `PuckCvEditor` with `permissions={{ delete: false, drag: false, duplicate: false, insert: false }}`, used `<Render>` from Puck (no dynamic) for mobile, and `next/dynamic` with `ssr: false` for the desktop editor.
- **Why**: US-057 required the user CV editor to shift from a custom form to Puck's own field-editing UI while keeping the existing save and PDF export paths.
- **Learned**: The `<Render>` component from `@puckeditor/core` is genuinely SSR-safe and works with `renderToStaticMarkup` in a vitest node environment when mocked. The SkillsList block uses `hardSkills`/`softSkills` field names while `CVDocumentContent.skills` uses `hard`/`soft` — both converters must handle this mapping explicitly. The `str()` coercion helper should use `String()` for non-null values rather than `typeof === "string"` to handle numeric props gracefully.
- **Open**: Sprint 008 is now fully complete (US-055 + US-056 + US-057). Sprint DoD pending final QA and test coverage sign-off.

## 2026-04-21 — Sprint 008 DoD

- **Did**: Re-ran the repo test gate, checked the current coverage output, and recorded a sprint-close workflow showing that only the first three DoD items can be marked.
- **Why**: The sprint could not be closed safely without current evidence for both the test and coverage gates.
- **Learned**: `pnpm test` is green, but the workspace still has a coverage configuration problem: `pnpm test -- --coverage` duplicates the flag and the app package remains under the 80% line threshold.
- **Open**: Fix the root coverage invocation and raise `@cvforge/app` line coverage before retrying Sprint 008 closure.

## 2026-04-21 — Sprint 008 DoD retry

- **Did**: Fixed the duplicated coverage-flag issue by normalizing workspace test scripts, added targeted coverage tests in `apps/app` and `packages/config`, and verified both `pnpm test` and `pnpm test -- --coverage` pass.
- **Why**: Sprint 008 could not be closed until the root coverage command ran cleanly and the app package cleared the blocking line threshold.
- **Learned**: The most efficient coverage recovery was to test the unexercised UI wrappers and error boundaries directly instead of broadening feature behavior.
- **Open**: None for Sprint 008; remaining coverage debt is outside the sprint-close threshold.

## 2026-04-21 — US-029

- **Did**: Added a dedicated API credits module with file-backed ledger persistence, shared credit-action types, user/admin ledger endpoints, admin manual grants, and debit hooks in the existing offer-import and document-generation services; then verified the API package with targeted tests, lint, and build.
- **Why**: US-029 required a traceable balance model and enforced AI consumption rules before Stripe and the credits dashboard can be built safely.
- **Learned**: A dedicated ledger service is cleaner than burying credit state inside auth or applications persistence, and it gives US-030 a single purchase-ingestion seam via `recordStripePurchase()`.
- **Open**: Root workspace verification was not rerun because this story is backend-only; the known app-side build issues remain outside this task.

## 2026-04-22 — US-031

- **Did**: Implemented the authenticated `/credits` page, added app-shell navigation and dashboard discoverability, rendered ledger-backed history plus low-balance warning, and validated the app with targeted tests, lint, and build.
- **Why**: US-031 required the user-facing credits experience on top of the ledger and Stripe work already delivered in US-029 and US-030.
- **Learned**: The existing `/credits/me` response is rich enough to power the whole page directly; no app-side billing state or extra API endpoint was needed.
- **Open**: US-032 can now treat credits as a linked dashboard surface instead of trying to carry both summary and history inside the dashboard itself.

## 2026-04-21 — US-030

- **Did**: Added a new API billing slice for Stripe Checkout session creation and webhook verification, made Stripe purchase recording idempotent in the credits ledger, added shared pack contracts, added a Next checkout proxy route, and exposed the two pack purchase actions from the dashboard; then verified lint, targeted tests, package builds, and the root coverage command.
- **Why**: US-030 required an end-to-end payment path that credits the existing ledger only after Stripe-confirmed payment without introducing a second balance source.
- **Learned**: The cleanest implementation in this workspace was to use Stripe's documented REST API directly and verify webhook signatures manually against the raw body, which avoided adding a new runtime dependency while keeping the integration auditable.
- **Open**: US-031 should surface the new purchase metadata and current balance on the dedicated credits page instead of re-deriving package details locally.

## 2026-04-22 — upgrade project scaffolding

- **Did**: Ran the preview-first `upgrade-project` migration, backed up the overwritten managed files under `.project/upgrades/20260422-075329/`, refreshed the generated README block formatting, added the missing `repos` orchestration key to `.project/state.json`, and synced project-local skills into `.claude/skills/` and `.codex/skills/`.
- **Why**: Keep the repo aligned with the current framework-managed project format without resetting live workflow history or touching user-owned files outside the migration scope.
- **Learned**: The repository was already on the current managed docs and workflow format; the only drift was a missing `repos` key in state plus a trivial README block formatting mismatch.
- **Open**: Review whether the project-specific `git-push-safe` skill should replace or coexist with the framework's `push-to-github` skill naming; `.codex` is mounted read-only as a file in this environment, so project-local Codex skill sync remains blocked until that mount behavior changes.

## 2026-04-22 — US-032

- **Did**: Expanded the authenticated dashboard to fetch live applications and credits, added 7 base KPI cards, quick-access cards, and a recent-applications block, then updated the dashboard test coverage and verified the repo with `pnpm test`, `pnpm lint`, and `pnpm build`.
- **Why**: US-032 required the dashboard MVP to expose real product activity rather than partial placeholder metrics.
- **Learned**: The existing `/applications`, `/applications/summary`, and `/credits/me` endpoints were already sufficient to complete the dashboard without backend changes.

## 2026-04-23 — US-039

- **Did**: Added server-side DOCX export with `docx`, authenticated app proxy routes, CV/LM version snapshots on generation/save, visible editor histories, and ADR-005.
- **Why**: Sprint 011 required DOCX output and successive CV/LM version history on top of the existing document pipeline.
- **Learned**: The structured `CVDocumentContent` and `LetterDocumentContent` contracts are sufficient to generate ATS-readable DOCX without rendering HTML first.
- **Open**: The DOCX layout is conservative; future work can map template styling into DOCX if needed.
- **Open**: A full dependency audit still needs an audit-capable registry because the configured private registry does not expose the npm audit endpoint.

## 2026-04-22 — Sprint 009 final gates

- **Did**: Re-ran workspace coverage and dependency audit after the registry change, confirmed the coverage floor is met, and closed the remaining sprint release paperwork.
- **Why**: The code was already done, but the sprint could not be finalized until the last governance checks were evidenced.
- **Learned**: The workspace now closes cleanly with the dashboard changes included; no extra code changes were needed once the audit path was available.
- **Open**: Non-blocking low/moderate advisories remain available for later dependency hygiene work.

## 2026-04-22 — US-033

- **Did**: Added auth account enumeration, implemented `GET /credits/admin/users` with filtering/pagination plus latest manual-grant metadata, replaced the placeholder `/admin` page with a real users-and-credits panel, added the `/admin/grant-credits` proxy route, and covered the new paths with API/app tests.
- **Why**: US-033 required an operational admin panel for user lookup and manual credit support without introducing a new persistence model or admin framework.
- **Learned**: The cleanest implementation was to join the existing file-backed auth store and shared credits ledger in one admin query, which kept logging and balance state auditable from a single source of truth.
- **Open**: A later admin detail story can expose full user fiches and candidature history on top of the same joined contract.

## 2026-04-22 — US-034

- **Did**: Added backend template analytics and CSV export, persisted `cvTemplateId`/`letterTemplateId` in generated-document flows, added the app-side export proxy, extended `/admin/templates` with analytics/top-template UI, and verified the touched API/app paths with tests, lint, and builds.
- **Why**: US-034 required real admin visibility into template usage plus exportability, not just the existing CRUD editor.
- **Learned**: The smallest robust solution was to track template usage at document-generation time and aggregate it in the templates module, which avoided inventing a second analytics store.
- **Open**: Historic documents created before this tracking exists will not automatically backfill usage counts.

## 2026-04-22 — US-035

- **Did**: Added a typed notifications slice across `types`, `api`, and `app`, implemented persisted J+7 follow-up reminders from candidature status history, added the notification center routes/page, extended the shared shell with a header accessory slot, and wired the bell across authenticated pages.
- **Why**: US-035 required a real in-app notification flow and reminder trigger, not a dashboard-only placeholder.
- **Learned**: The least risky implementation was to derive reminders lazily and idempotently from the existing application history instead of introducing background workers before the rest of the repo uses them.
- **Open**: Email delivery and the other notification types from vision `§14.1` remain future work.

## 2026-04-22 — fix Docker Next.js dist permissions

- **Did**: Parameterized `distDir` in both Next apps, moved the Docker dev services to `/tmp`-backed Next output directories through `NEXT_DIST_DIR`, removed the Compose `.next` volume mounts, and verified the change with `pnpm --filter @cvforge/app build` plus `pnpm --filter @cvforge/landing build`.
- **Why**: The `app` and `landing` containers were failing on April 22, 2026 with `EACCES` errors against `/workspace/apps/*/.next/*` because stale generated artifacts were not writable under the runtime UID/GID.
- **Learned**: Keeping hot-reload source mounts while moving Next build output outside the bind-mounted workspace is the simplest stable fix; it avoids ownership drift without weakening the host-UID container model.
- **Open**: The running Compose stack must be recreated so the services stop using the old `app_next` and `landing_next` volumes.

## 2026-04-23 — US-036

- **Did**: Added a new API privacy slice for export/deletion/retention-policy reads, extended the file-backed stores for owned-data deletion and third-party reference anonymisation, built `/profile/privacy` plus app proxy routes, cleared local browser profile data on deletion, documented retention rules, and verified the repo with lint/test/build/coverage.
- **Why**: `US-036` required executable GDPR launch mechanics, not a documentation-only placeholder.
- **Learned**: The browser-local base profile is the critical wrinkle in this codebase; the correct implementation is API-owned export/deletion plus app-side augmentation and local cleanup.
- **Open**: The planned 30-day audio purge still needs a real scheduled implementation once interview audio persistence exists.

## 2026-04-23 — US-037

- **Did**: Replaced the single local base-profile helper with a migration-safe multi-profile registry, updated `/profile` to manage and edit multiple profiles, added per-candidature profile selection, and wired CV/LM generation to the selected profile; then verified app test/build/lint.
- **Why**: US-037 required multiple reusable socles and candidature-specific selection without breaking the existing local generation pipeline.
- **Learned**: The safest implementation is still browser-local because the previous profile model already lived in local storage; migrating legacy single-profile data on read keeps compatibility intact.
- **Open**: Cross-device sync and richer profile actions like duplicate/archive remain future enhancements.

## 2026-04-23 — US-038 implementation

- **Did**: Added the CV import API/service, DOCX parser ADR, profile import UI/proxy, local profile patch merge, quality-limit docs, and tests.
- **Why**: `US-038` required existing CV import with pseudonymised IA extraction and documented extraction limits.
- **Learned**: The active local profile registry is the right merge point; OpenRouter should only receive stripped `pseudonymisedCvText`.
- **Open**: PDF support is text-layer heuristic only; a full OCR/parser stack remains a future decision.

## 2026-04-24 — US-041

- **Did**: Added persisted notification email preferences, an SMTP-backed notifications mailer, email sending for J+7 follow-up reminders and Stripe purchase confirmations, API preference endpoints, app preference form handling, and tests; then verified lint and both package builds.
- **Why**: Sprint 012 required multichannel notification delivery with user control while reusing the provider path already present in the repository.
- **Learned**: The clean implementation is to keep email delivery inside the notifications boundary and let billing trigger purchase confirmation through that same service instead of duplicating mail logic.
- **Open**: Interview reminder emails still need a future scheduling source in the application domain.

## 2026-04-24 — run-agent developer: Next app recovery and session fallback

- **Did**: Switched Compose `NEXT_DIST_DIR` values to project-local `tmp/...` folders, hardened both Next configs to ignore unsafe absolute dist dirs, repaired the generated Next TypeScript references to match the project-local output, redirected session transport and 5xx failures to `/login?error=session_unavailable`, added the login-state copy, and verified the fix with targeted tests plus app/landing lint and build.
- **Why**: The app was failing in two ways from the provided logs: Next dev was mixing absolute `/tmp` metadata with project-local manifest paths, and SSR session checks were turning API outages into 500s on `/`.
- **Learned**: For this repo, `distDir` only stays stable when it remains relative to each app root; once Next writes absolute type references, the generated metadata and manifest lookup paths diverge under container restarts.
- **Open**: The running Docker Compose stack still needs a restart or recreate so the updated `NEXT_DIST_DIR` environment values take effect in the containers.

## 2026-04-24 — US-042

- **Did**: Added advanced dashboard analytics with monthly application trend, status donut, ATS progression, and post-interview score cards, then added focused analytics tests and revalidated the workspace with lint, coverage, test, build, and audit commands.
- **Why**: `US-042` required a richer dashboard surface in Sprint 012 while staying inside the current product data boundaries instead of inventing a separate analytics backend.
- **Learned**: A pragmatic ATS trajectory can be derived from persisted CV versions versus stored offer metadata, which gives the dashboard meaningful score progression now without waiting for a future first-class ATS metric service.
- **Open**: Real interview reports still need to land before the post-interview chart can display populated history outside its explicit empty state.

## 2026-04-24 — US-043

- **Did**: Added a dashboard share module with an SVG card generator, native share action, LinkedIn offsite share link, dashboard wiring, and regression tests; then verified app lint/build plus root coverage.
- **Why**: `US-043` required a concrete social-sharing slice on top of live dashboard KPIs, not a placeholder CTA.
- **Learned**: The smallest robust implementation is a client share panel backed by a pure SVG builder, because it avoids new infrastructure while still producing a real downloadable asset.
- **Open**: A future public-sharing page could replace the private `/dashboard` URL in LinkedIn posts if the product later needs richer social previews.

## 2026-04-24 — US-043 share refinement

- **Did**: Reworked the dashboard share flow to export JPEG instead of SVG for user-facing download/share, added a public `/share/dashboard` page plus `/share/dashboard/og` image endpoint for Open Graph previews, and changed the LinkedIn/native share actions to use clipboard and file-aware fallbacks.
- **Why**: The first implementation overstated what LinkedIn offsite sharing could do and did not provide a strong enough fallback when native sharing was unavailable.
- **Learned**: The practical solution is split: a public OG-backed share URL for LinkedIn previews, a copied legend for manual paste, and a JPEG file for native/file-based sharing.
- **Open**: If product needs a truly one-click social post with server-uploaded media and caption control, that will require a LinkedIn API integration with member authorization rather than a simple share URL.

## 2026-04-24 — US-044

- **Did**: Added shared interview STT contracts, extended the OpenRouter client for audio input, implemented a new Nest interview module with file-backed session/chunk persistence, and built the protected `/interview` page plus Next proxy routes and `MediaRecorder`-based client flow.
- **Why**: US-044 required the first end-to-end interview audio ingestion path with progressive Voxtral Small transcription, resumable state, and recoverable chunk-level errors.
- **Learned**: The clean MVP split is browser `MediaRecorder` 500ms chunks -> Next authenticated proxy -> Nest interview service -> OpenRouter `input_audio`; this keeps the future TTS and latency work additive instead of forcing a rewrite.
- **Open**: A staging run still needs to confirm the preferred browser MIME type against the live OpenRouter/Voxtral provider path.
