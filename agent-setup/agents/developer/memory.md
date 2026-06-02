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

## 2026-04-26 — US-048

- **Did**: Added recruiter-profile types/constants and completed-session state in `@cvforge/types`, extended the Nest interview service/controller/store with profile-aware prompt shaping plus `finish` handling, added the Next finish route, updated `InterviewStudio` with profile selection and clean session termination, and verified targeted tests plus touched-package lint/build.
- **Why**: US-048 required the interview mode to match the vision's recruiter profiles and give QA a real launch/finish lifecycle instead of a client-only reset.
- **Learned**: The existing interview slice was already structurally sound; the cleanest fix was to enrich the shared contract and keep app/API behavior aligned around it.
- **Open**: Numeric coverage was not re-measured in this run; US-049 should decide whether the completed session also needs a persisted summary payload before report generation starts.

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

## 2026-04-24 — US-045

- **Did**: Added `streamChat()` async generator to `OpenRouterService` (SSE parsing, `stream: true`), extended `InterviewSessionSummary` with `aiResponse`/`aiResponseGeneratedAt`/`aiStatus`, added `streamAIResponse()` to `InterviewService` (guards on empty transcript, yields `InterviewAIResponseEvent` chunks), added `@Sse()` endpoint to `InterviewController`, created Next.js proxy route for SSE stream, and updated `InterviewStudio` with sentence-boundary `SpeechSynthesis` TTS playback and observable pipeline event log.
- **Why**: US-045 required the full LLM→TTS pipeline where the first audio chunk fires before generation completes.
- **Learned**: NestJS `@Sse()` + RxJS `Observable<MessageEvent>` wrapping an async generator is the cleanest SSE pattern — avoids raw `@Res()` and keeps the service generator agnostic of HTTP. Web Speech API `SpeechSynthesis` covers the TTS need without a new dependency or ADR. Sentence-boundary flushing (`/[.!?]\s/u`) plus a `done` event flush ensures no text is dropped.
- **Open**: `streamAIResponse()` in the studio does not cancel the SSE fetch on unmount — add `AbortController` in a future cleanup. The sentence-boundary regex may not cover all punctuation styles (ellipsis, em-dash pauses).

## 2026-04-24 — US-044

- **Did**: Added shared interview STT contracts, extended the OpenRouter client for audio input, implemented a new Nest interview module with file-backed session/chunk persistence, and built the protected `/interview` page plus Next proxy routes and `MediaRecorder`-based client flow.
- **Why**: US-044 required the first end-to-end interview audio ingestion path with progressive Voxtral Small transcription, resumable state, and recoverable chunk-level errors.
- **Learned**: The clean MVP split is browser `MediaRecorder` 500ms chunks -> Next authenticated proxy -> Nest interview service -> OpenRouter `input_audio`; this keeps the future TTS and latency work additive instead of forcing a rewrite.
- **Open**: A staging run still needs to confirm the preferred browser MIME type against the live OpenRouter/Voxtral provider path.

## 2026-04-24 — fix STT stop action

- **Did**: Hardened the interview studio stop path with a recording-state guard, cleared stale recorder refs when capture stops, added Safari `webkitAudioContext` fallback for WAV conversion, and added a regression test where `MediaRecorder.stop()` throws when inactive.
- **Why**: Real browser `MediaRecorder.stop()` is not idempotent; hitting `Arreter` or cleanup paths after the recorder has already stopped can raise `InvalidStateError`.
- **Learned**: The component test double must model inactive recorder failures, otherwise the suite hides the exact browser behavior that users hit.
- **Open**: If users still see conversion failures, collect the browser/version and recorded MIME type to validate the WebM/Opus decode path against that engine.

## 2026-04-24 — fix interview chunk 413

- **Did**: Resampled browser WAV uploads to 16 kHz before base64 encoding, configured Next's request body cap for interview chunks to `16mb`, configured Nest JSON/urlencoded body parsers with the same cap, and added regression tests around config and WAV sample rate.
- **Why**: The STT stop flow converted compressed browser audio into a much larger WAV payload, causing `/interview/:sessionId/chunk` to fail with `413 Payload Too Large` before transcription.
- **Learned**: Browser `AudioContext` commonly decodes at 48 kHz; sending that as PCM WAV is unnecessarily large for speech recognition when 16 kHz mono is enough.
- **Open**: The running Next/API dev processes or Docker containers must be restarted so the new body-limit configuration is active.

## 2026-04-24 — fix Voxtral transcription path

## 2026-04-26 — Sprint 013 DoD finalization

- **Did**: Stabilized the API bootstrap coverage test with a longer timeout, re-ran `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test -- --coverage`, then marked Sprint 013 DoD complete and added Sprint 013 to `completed_sprints`.
- **Why**: The sprint already had all task-level evidence, but the DoD could not be closed while the coverage gate was flaky under instrumentation mode.
- **Learned**: The root coverage command is sensitive to Vitest timing overhead on `apps/api/src/main.test.ts`; a standard 5s timeout was too tight once coverage instrumentation was enabled.
- **Open**: No functional blocker remains for Sprint 013; if the bootstrap test slows down again, the next step is to reduce module-load work in `main.ts` test setup rather than keep increasing timeouts.

## 2026-04-26 — US-049 implementation

- **Did**: Added candidature-linked interview sessions, generated structured post-interview reports at session completion, persisted reports on both interview sessions and applications, and wired the interview/dashboard app surfaces to consume that data.
- **Why**: The story could not pass with UI-only placeholders; the missing contract was end-to-end across shared types, API persistence, and dashboard analytics.
- **Learned**: The cleanest implementation is to treat interview reporting as application-owned analytics while keeping the raw session summary as the generation source of truth.
- **Open**: `InterviewStudio` now carries more UI/state responsibility; if the interview surface grows again in `US-050`, splitting the report and control panels into subcomponents will improve maintainability.

- **Did**: Switched interview transcription from OpenRouter chat completions to Mistral's `/v1/audio/transcriptions` endpoint, added dedicated Mistral config/env support, normalized legacy Voxtral model names to `voxtral-mini-latest`, and updated API tests plus env defaults.
- **Why**: The previous integration sent audio as a chat prompt, which returned conversational refusal text instead of real STT output.
- **Learned**: Voxtral transcription must be treated as an audio-upload API call with a Mistral API key, not as a generic multimodal chat completion.
- **Open**: If product also wants spoken AI output, that remains a separate TTS path; the transcription endpoint only returns text.

## 2026-04-24 — align Voxtral integration to OpenRouter-only

- **Did**: Removed direct Mistral env/config usage, routed interview transcription back through OpenRouter `chat/completions` with `input_audio`, restored the OpenRouter Voxtral model id as the STT default, and updated tests plus env docs accordingly.
- **Why**: The product constraint is single-provider billing and routing through OpenRouter only, with no direct vendor API dependency.
- **Learned**: OpenRouter's official multimodal docs already cover audio input on chat completions, so vendor lock can be avoided while still using Voxtral for STT.
- **Open**: If we replace browser speech synthesis with model-generated audio later, we should choose between OpenRouter's streamed audio response path and its dedicated TTS endpoint based on the target UX.

## 2026-04-24 — improve interview language control and prompt discipline

- **Did**: Added a session-level interview language (`fr` or `en`) end to end, strengthened the Voxtral transcription request with a strict system prompt plus low-temperature/short-output settings, defaulted interviewer generation to `INTERVIEW_AI_MODEL` or the same Voxtral model, and made browser speech synthesis follow the selected language.
- **Why**: The previous flow let STT drift into generic assistant answers and let the interviewer reply language vary too much, which made spoken output sound unnatural.
- **Learned**: For audio-capable chat models, explicit role separation and a session language contract matter more than generic "transcribe this" prompting. Carrying the same language into STT, LLM response, and TTS keeps the interaction noticeably more coherent.
- **Open**: We still use browser `speechSynthesis` for audio output. If we want lower end-to-end latency or a more controlled voice, the next step is to prototype OpenRouter audio output on a model/provider that supports streamed `delta.audio`.

## 2026-04-24 — switch interview STT default away from Voxtral

- **Did**: Changed the default interview transcription model from `mistralai/voxtral-small-24b-2507` to `openai/gpt-audio` while keeping routing on OpenRouter, lowered the STT completion cap to `64` tokens, and separated the default interviewer reply model back to `mistralai/mistral-small-2603`.
- **Why**: Live transcripts were still hallucinating unrelated biographies instead of transcribing the spoken sentence, so the prior model choice was not robust enough for this path.
- **Learned**: Staying on OpenRouter does not require using the same model for STT and text generation. Audio transcription reliability and interviewer text quality should be tuned independently.
- **Open**: This fixes the default model selection, but the next live check should confirm whether your OpenRouter account routes `openai/gpt-audio` correctly for short French utterances like `le ciel est bleu`.

## 2026-04-24 — US-046

- **Did**: Added browser VAD to `InterviewStudio` using native `AnalyserNode` (fftSize 256, normalized RMS, threshold 0.05), an animated mic pulse badge with aria-live, a slim RMS level bar, and an amber "Thinking…" spinner badge during LLM generation; updated test stubs for `createAnalyser`/`createMediaStreamSource` and no-op `requestAnimationFrame`.
- **Why**: US-046 required real-time visual feedback without introducing a new library or API surface.
- **Learned**: Stubbing `requestAnimationFrame` as a no-op (returning 0, never calling the callback) is the cleanest way to prevent the VAD RAF loop from running in happy-dom tests without heap exhaustion. The `vadLevel` state driving badge rendering causes RAF-frequency React re-renders during recording; this is acceptable for this component but a direct DOM mutation approach would be more optimal at scale.
- **Open**: US-047 latency instrumentation can attach timing checkpoints to the existing `pipelineEvents` log without new state.

## 2026-04-26 — US-050 implementation

- **Did**: Implemented audio replay (Object URL ref + `<audio>` element), free practice mode (removed `Boolean(applicationId)` gate + selector option), RGPD purge service (`InterviewPurgeService`, 24h `setInterval`, 30-day cutoff, `purgeCompletedBefore` in store), and pre-generation (`prefetchNextQuestion` endpoint + `streamAIResponse` short-circuit + frontend `triggerPrefetch`).
- **Why**: All four US-050 acceptance criteria required code changes; the free-practice fix was a one-line UI bug; the purge service was the most architecturally significant addition.
- **Learned**: Sharing the `INTERVIEW_STORE` token between `InterviewService` and `InterviewPurgeService` via a named provider constant is the correct pattern for NestJS when two services need the same infrastructure object.
- **Open**: Audio blob URL is transient — MinIO-backed persistence is a future sprint. Purge `setInterval` should become a BullMQ cron job once MinIO lands.

## 2026-04-26 — US-060

- **Did**: Refactored `AppShell` in `packages/ui` for desktop-first navigation: new `MobileDrawerNav` `"use client"` component with hamburger + slide-in drawer; updated `ShellTopBar` with breadcrumb + avatar + notification bell; 240px fixed sidebar at ≥1024px; role-gated Admin nav item via `filterNavForRole()`; updated 12 authenticated pages to pass `userEmail`/`userRole`/`breadcrumb` from their existing sessions; updated `content.ts` with canonical 8-item nav; 204 tests passing.
- **Why**: US-060 sprint 016 — desktop-first UX redesign baseline navigation.
- **Learned**: `"use client"` components work cleanly in `packages/ui` for Next.js App Router; SSR-safe because `useState(false)` means drawer stays closed on initial render. The `MobileDrawerNav` hamburger renders in `renderToStaticMarkup` tests, enabling full coverage without Next.js runtime.
- **Open**: Focus-trap within drawer is advisory (tab cycles outside drawer on some screen readers). Consider a proper `focus-trap-react` library if UX testing reveals issues.

## 2026-05-07 — fix /applications/summary routing conflict

- **Did**: Moved `@Get("summary")` above `@Get(":applicationId")` in `ApplicationsController`. The parameterized route was shadowing the literal `summary` path — NestJS matched `/applications/summary` as `applicationId = "summary"`, causing a `NotFoundException` that surfaced as 500 errors on `/dashboard` and `/candidatures`.
- **Why**: Classic NestJS route-order pitfall: literal routes must always be declared before parameterized routes at the same path level.
- **Learned**: In NestJS, route registration is order-dependent. Any `@Get("literal")` at the same level as `@Get(":param")` must come first — otherwise the param route wins. This applies to `summary`, `export`, `me`, etc. Always check for existing literal siblings when adding a new parameterized GET at a controller level.
- **Open**: None.

## 2026-05-07 — US-062

- **Did**: Added `GET /applications/:applicationId` endpoint + `getApplicationForUser()` service method (returns `DraftApplication`, strips raw fields). Created `/candidatures/[id]/page.tsx` (server) + `CandidatureDetailTabs` (client, 5 tabs: Offre/CV/LM/Interviews/Historique). Updated `CandidaturesTable` "Voir" button and row click to navigate to `/candidatures/[id]` via `useRouter`. 18 new tests; 251 app + 244 API tests all passing.
- **Why**: US-062 sprint 016 — desktop-first candidature detail screen with tabbed layout.
- **Learned**: Tab panels must always render (display:none for inactive) for `renderToStaticMarkup` tests to see non-default tab content. `useRouter` from `next/navigation` must be mocked in tests that use client components importing it.
- **Open**: Focus-trap within tab keyboard navigation is advisory — ArrowLeft/Right works but Tab key cycles outside the tablist on some screen readers.

## 2026-05-07 — US-061

- **Did**: Converted the candidatures list from a card-per-row layout to a filtered/sorted/paginated table with a slide-over detail panel. Created `CandidaturesTable` (client, filters + sort + pagination + slide-over trigger), `CandidaturesSlideOver` (client, `role="dialog"`, ESC/backdrop close, full detail + actions), and `NouvelleCondidatureModal` (client, URL + text import forms). Refactored `page.tsx` to a lean server component. Added 27 new tests (233 total). Lint, tests, and build all green.
- **Why**: US-061 sprint 016 — desktop-first table UX replacing the verbose card list.
- **Learned**: `renderToStaticMarkup` renders client components with their initial state — this is the key test isolation pattern for `"use client"` components. Modals/panels that start closed don't appear in SSR markup; tests must be updated accordingly (remove assertions for content inside initially-closed overlays).
- **Open**: `<tr onClick>` row activation is click-only; keyboard (Enter/Space) requires an additional `onKeyDown` handler for full keyboard accessibility — advisory for a future pass.

## 2026-05-07 — US-064

- **Did**: Refactored `InterviewStudio` for auto-VAD: added `VadStatus` state machine (`listening/recording/processing/muted`), `initMicStream()` for auto-mic on mount with `preloadedSessionId`, `autoStartRecording()` triggered by VAD speech detection, 45-frame silence threshold for auto-stop. Added chat transcript (alternating bubbles from `session.chunks` + streamed AI), session timer, "Fin de session" at top, mute toggle. Moved `[sessionId]/route.ts` → `[sessionId]/session/route.ts` to resolve page+route routing conflict from US-063. Fixed TypeScript build error in `candidature-detail-tabs.tsx`. Added 8 new VAD tests.
- **Why**: US-064 removes push-to-talk and replaces with fully automatic VAD-driven recording. Routing conflict fix was a prerequisite for a clean build.
- **Learned**: Next.js App Router can't have both `[param]/page.tsx` and `[param]/route.ts` at the same path segment — must nest the route. VAD RAF loop must use refs (not state) for all values it acts on to avoid stale closures. `SILENCE_FRAMES_TO_STOP = 45` (~750ms at 60fps) is a reasonable auto-stop threshold for speech interaction.
- **Open**: AbortController not wired on unmount for SSE stream in `streamAIResponse` (pre-existing). Language/aiState stale closures in `speakNext` (pre-existing).

## 2026-05-07 — US-065

- **Did**: Added `InterviewMessage` type and `messages: InterviewMessage[]` field to `InterviewSessionSummary`. Added `normalizeMessages()` in `interview.types.ts` and called it in `interview.store.ts`. In `interview.service.ts`: added `appendMessage()` helper with `MAX_MESSAGES=20` cap, added `buildConversation()` private method, initialized `messages: []` in `startSession()`, appended user messages on each successful STT chunk, appended assistant messages after each AI response (both stream and prefetch paths), and replaced the flat `user(transcript)` call with `buildConversation(session.messages)` in `streamAIResponse()` and `prefetchNextQuestion()`. Fixed `messages` field in 4 test fixtures. Added 4 new service tests including the 3-exchange context continuity assertion.
- **Why**: The LLM was stateless — it received only the flat `session.transcript` string and had no knowledge of its own prior turns, causing it to repeat itself and ignore context.
- **Learned**: The correct pattern for multi-turn LLM continuity is to persist `messages[]` in the session store (not reconstruct from chunks), append to it on the server side, and pass the full array as the OpenAI-style messages array each call. The file-backed store satisfies all AC including RGPD purge without Redis.
- **Open**: `MAX_MESSAGES=20` drops oldest messages without guaranteeing user+assistant pair alignment — advisory only at current session lengths.

## 2026-05-07 — US-063

- **Did**: Created `/interview/new` 3-step setup wizard (candidature select → profile cards → language/params), `/interview/[sessionId]/page.tsx` shell, extended `InterviewStudio` with `preloadedSessionId` prop, and added "Préparer un entretien" CTA to candidature detail. 12 new tests added; all 263 tests green.
- **Why**: Sprint 017 US-063 — decouples session configuration from the active studio, enabling the setup→studio navigation flow.
- **Learned**: Client components using `useRouter` must have `next/navigation` mocked in server-render tests; page-level tests use `renderToStaticMarkup` which executes initial client state.
- **Open**: US-064 will remove push-to-talk and refactor the in-session studio; the locked dropdowns in `InterviewStudio` are acceptable until then.

## 2026-06-01 — PDF CV/LM fond blanc + tient sur une page (ad hoc · analyze-design-dev-review-20260601100000)

- **Did**: Découpé `cv-pdf-export.service.ts` (840L) en 4 modules : `cv-pdf-styles.ts` (styles CSS partagés, fond blanc #fff + accents rouge #b22222), `cv-html-templates.ts` (renderCvPdfHtml + renderLetterPdfHtml), `cv-docx-templates.ts` (renderCvDocx + renderLetterDocx), service réduit à 246L. Corrigé `background: #f6f3ed → #ffffff`, réduit font-size (11.5pt→10.5pt), line-height (1.5→1.3), marges (12mm→10mm), gaps de section (~-40%). Extrait `callPuppeteer()` pour dédupliquer gestion erreur Puppeteer.
- **Why**: Le PDF exporté avait un fond crème visible et dépassait la page A4 — insatisfaisant pour des recruteurs. Le fichier source était 840L, au-dessus du seuil warning §9.
- **Learned**: `printBackground: true` dans Puppeteer imprime la `background-color` CSS — donc changer la couleur de fond CSS suffit, pas besoin de modifier les options Puppeteer. Quand on extrait une constante CSS partagée (`SHARED_PDF_STYLES`), s'assurer qu'elle n'inclut pas les propriétés `h2` qui divergent entre les deux templates.
- **Open**: `cv-html-templates.ts` à 319L (>300 target, <400 warning) — contenu template, acceptable en l'état.

## 2026-06-02 — koklo-infra: fix data loss + add backup strategy (ad hoc · run-agent)
- **Context**: ad hoc · last sprint [[sprints/sprint-017]] · last run [[workflows/runs/analyze-design-dev-review-20260601110000]]
- **Did**: Diagnostiqué la perte de données sur VPS20 après `make deploy-cvforge`. Ajouté service `db_backup` (nightly pg_dump, 7j/4s/6m, `prodrigestivill/postgres-backup-local`) dans `stacks/cvforge/docker-compose.yml`. Supprimé `--force-recreate` du Ansible deploy loop (remplacé par `docker compose up -d` — images updated by `pull`). Ajouté pré-deploy pg_dump dans `setup-vps20.yml`. Ajouté `backup-cvforge`, `restore-cvforge`, `volumes-cvforge` dans Makefile.
- **Why**: Les volumes Docker nommés sont locaux au VPS — aucun backup n'existait. La perte de données a probablement eu lieu lors d'un recréation du VPS ou d'un `docker compose down -v` accidentel. `--force-recreate` était inutile après `docker compose pull` et causait des restarts non nécessaires sur postgres/redis.
- **Learned**: `--force-recreate` ne supprime pas les volumes mais est redondant après `docker compose pull` (Docker Compose recrée automatiquement les conteneurs dont l'image a changé). La vraie protection contre la perte de données est un backup off-VPS ; les volumes Docker seuls ne résistent pas à une destruction du VPS.
- **Open**: Le backup `db_backup` reste sur le VPS (volume `db_backups`) — il ne survit pas à un wipe du VPS. Pour une durabilité réelle, ajouter un sync vers un S3 externe (Scaleway, Backblaze) via `rclone` ou un second job cron.

## 2026-06-01 — profile CRUD + border-radius (stage 03 · [[workflows/runs/analyze-design-dev-review-20260601110000]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260601110000/03-implement]]
- **Did**: Splité `profile-editor.tsx` (668L→292L) en extrayant les sub-composants dans `profile-entry-fields.tsx` (202L). Créé `profile-list.tsx` (160L) pour le listing CRUD en table. Créé `/profile/new` et `/profile/[id]/edit` routes Next.js. Réduit `radius.sm/md/lg` dans `design-system.ts` et synchronisé 4 fichiers inline.
- **Why**: La page profil était monolithique (un seul fichier gérant listing + édition), dépassait le seuil warning §9. L'utilisateur demandait un CRUD classique et des bords moins arrondis.
- **Learned**: `useRouter()` dans un composant client Next.js échoue en test `renderToStaticMarkup` sans mock `next/navigation` — toujours ajouter le mock dans les tests de pages qui importent des composants client avec `useRouter`.
- **Open**: None.

## 2026-06-02 — champ raffinement génération LM (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602120000]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602120000/03-implement]]
- **Did**: Ajouté `refinement?: string` à `LetterGenerationRequest` (interface dédiée). Propagé à travers 3 surfaces UI (slide-over, LmTab, LetterEditor), route proxy Next.js, et NestJS service + prompt. Créé `/letters/[applicationId]/regenerate/route.ts`. Lint propre, 273 tests passés.
- **Why**: L'utilisateur voulait enrichir la génération de LM avec un contexte de motivation libre.
- **Learned**: Le `LetterEditor` charge le profil depuis localStorage (same pattern que `GenerateLetterButton`) pour la régénération — le profil n'est pas disponible côté serveur sur cette page.
- **Open**: `letter-editor.tsx` ~460L (advisory warning threshold 400). Candidat à split `LetterRegenerateCard` dans prochain sprint.

## 2026-06-02 — améliorer formatage et contenu LM (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602140000]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602140000/03-implement]]
- **Did**: 7 fichiers modifiés — paragraph4 optionnel dans types/UI/PDF/DOCX/editor; marges PDF 25/20mm; couleur nom #1a1a1a; titre italic dans LMHeader React; spacing letter-meta 0.6rem; placeDate avant signature (PDF+React+DOCX); LETTER_SYSTEM_PROMPT 4 paragraphes avec métriques + personnalisation + formule de politesse. 247 tests API passés.
- **Why**: Instructions utilisateur détaillées pour améliorer la qualité et le formatage de la LM générée.
- **Learned**: `paragraph4` optionnel est la bonne approche pour rétrocompatibilité — les lettres existantes sans paragraph4 continuent de fonctionner. Le `normalizeUpdatedLetterContent` doit aussi gérer paragraph4 pour la sauvegarde manuelle.
- **Open**: `letter-editor.tsx` maintenant ~610L (dépasse le warning threshold 400). Candidat à split en plusieurs composants dans le prochain sprint.

## 2026-06-02 — améliorer la génération de CV — mise en forme + contenu (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602150000]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602150000/03-implement]]
- **Did**: 3 fichiers modifiés — `cv-pdf-styles.ts` marges 20mm/25mm, 24pt bold, 10pt/1.15; `cv-html-templates.ts` h2 small-caps, h3 bold 10.5pt, .company italic, .date-range, compétences 2 blocs ul distincts, langues avec "—"; `cv-generation.service.ts` CV_SYSTEM_PROMPT enrichi avec 8 règles (titre, summary, dates, contexte, achievements, skills, langues, cohérence). 247 tests passés, lint vert.
- **Why**: Instructions utilisateur détaillées (cahier de 40+ règles) pour améliorer la qualité visuelle du PDF CV et le contenu généré par l'IA.
- **Learned**: La séparation CSS entre `SHARED_PDF_STYLES` (partagé CV+LM) et les styles inline du template CV est la bonne architecture — ne pas mettre les règles `h2`/`h3` dans SHARED pour éviter des conflits avec le template LM qui a sa propre hiérarchie.
- **Open**: `cv-generation.service.ts` ~800L — CV_SYSTEM_PROMPT candidat à extraction en constante dans fichier séparé dans prochain sprint. DOCX templates non alignés sur le format de date "Jan. 2022".

## 2026-06-02 — CV ATS une page — typographie, layout, prompt density (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602160000]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602160000/03-implement]]
- **Did**: 3 fichiers modifiés — `cv-pdf-styles.ts` marges `1.5cm`, 18pt name, 9.5pt/1.05; `cv-html-templates.ts` h2 10pt, h3/company 9.5pt, items 4pt gap, skills → single `<p>` inline dots (hard only, soft supprimé), langues → single `<p>`, certifications → single `<p>`, formation → `<p>` flat par entrée, dead `.skills-block` CSS supprimé; `cv-generation.service.ts` CV_SYSTEM_PROMPT summary 3 lignes max, achievements 4/2 bullets selon type, formation compacte, soft skills `[]`. 247 tests passés, lint vert.
- **Why**: Instructions utilisateur ATS one-page avec contraintes précises de typographie et densité.
- **Learned**: La colonne CSS grid pour les compétences est incompatible avec les parseurs ATS — le rendu inline ` · ` est la seule approche ATS-safe. Supprimer les soft skills du prompt évite que l'AI les génère alors que le template ne les affiche plus.
- **Open**: `cv-generation.service.ts` CV_SYSTEM_PROMPT candidat à extraction dans fichier séparé. DOCX templates non alignés sur format compact formation.

## 2026-06-02 — compétences structurées par catégories (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602170000]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602170000/03-implement]]
- **Did**: 3 fichiers modifiés — `packages/types/src/index.ts` : `SkillCategory` + `categories?` dans `CVDocumentContent.skills` ; `cv-generation.service.ts` : import `SkillCategory`, `RawCvJson.skills.categories`, CV_SYSTEM_PROMPT 3 catégories (outils/métier/transverses), `normalizeSkillCategories()`, `buildSkills()` (hard = concat catégories) ; `cv-html-templates.ts` : `skillsSection` computed (catégories si présentes, fallback flat), placement après Profil/avant Expériences, `.skills-section border-top`. 259 tests passés, lint vert.
- **Why**: Section compétences sous forme de bloc structuré par catégories pour meilleure lisibilité ATS et recruteur.
- **Learned**: Ajouter `categories?` optionnel préserve la compat Puck sans toucher aucun mapper. `buildSkills()` centralise la logique hard=flat(categories) pour que l'éditeur Puck continue de recevoir une liste plate.
- **Open**: Placement des compétences dans le Puck editor reste après les expériences (old mapping) — divergence acceptable non bloquante.
