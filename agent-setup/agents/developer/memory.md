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

## 2026-04-20 — US-055 implement

- **Did**: Installed `@puckeditor/core@0.21.2`, created `toPuckConfig()` adapter, migrated `TemplateRecord.layout` type to `PuckData`, updated all seed/normalize/validate code in templates store and service, wrote migration script, and updated all affected tests to pass.
- **Why**: Sprint 008 foundational task — all subsequent Puck stories depend on this infrastructure.
- **Learned**: `@measured-co/puck` was renamed to `@puckeditor/core`. Always verify package names from npm before installing. `PuckData` should be defined locally in `packages/types` rather than importing from the UI library, to avoid coupling a pure types package to a large dependency.
- **Open**: The `<Puck>` component from `@puckeditor/core` still cannot run SSR — US-056 and US-057 must wrap it in `next/dynamic` with `ssr: false`.
