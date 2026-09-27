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

## 2026-07-09 — diagnose EACCES on /workspace/.data mkdir (ad hoc · run-agent)

- **Context**: ad hoc · production error report from user, no linked sprint task.
- **Did**: Traced `FileAuthAccountStore.writeState` → `auth.config.ts` default `stateFilePath` (`process.cwd()/.data/auth-state.json`) → `docker/api.Dockerfile` (`WORKDIR /workspace`, built/owned as root, no `USER` instruction) → `docker-compose.yml` (api container runs as `user: "${HOST_UID:-1000}:${HOST_GID:-1000}"`). `docker-compose.prod.yml` does not set `AUTH_STATE_FILE`, so prod falls back to the root-owned default path.
- **Why**: User reported `EACCES: permission denied, mkdir '/workspace/.data'` in prod NestJS logs on magic-link consumption.
- **Learned**: Root cause is an image-build-time vs runtime UID mismatch — the runner stage builds as root so `/workspace` is root-owned, but the container runs as a non-root UID, so any runtime `mkdirSync` under `/workspace` (like the auth JSON state store) fails in prod. Local dev works because the bind-mounted `./apps/api` volume is host-user-owned. Also flagged the JSON-file-based `FileAuthAccountStore` as fragile for multi-instance/ephemeral prod (state loss on redeploy) — a Postgres-backed store would be more robust, but that's a separate, larger change (stack already has Postgres).
- **Open**: Fix not yet applied — awaiting user decision on: (a) quick fix via `AUTH_STATE_FILE` env + volume perms, (b) `chown` the `.data` dir for the runtime UID in `docker/api.Dockerfile`, or (c) longer-term move to Postgres-backed auth store.
- **Open**: Decide whether the repository should add a real pre-commit configuration or remove that gate from the documented publish workflow.

## 2026-07-10 — US-075: split dashboard into kpi-row/recent-tables/quick-actions (sprint 020 · analyze-design-dev-review-20260710010750)

- **Did**: Rewrote `apps/app/app/dashboard/page.tsx` (672L→168L) into a thin composition of new `kpi-row.tsx` (86L), `recent-tables.tsx` (187L), `quick-actions.tsx` (56L). Deleted `analytics.ts`, `analytics.test.ts`, `charts.tsx`, `share-card.tsx` (fully orphaned once the 4 charts, LinkedIn share card, inline credit purchase form, and base-profile summary block were removed from the page). Rewrote `page.test.tsx` accordingly.
- **Why**: AC scoped the dashboard down to exactly 3 KPI + 2 tables + quick actions; user confirmed via AskUserQuestion (2026-07-10) to strip rather than relocate the extra sections, per the sprint's own "keep only what we use, add back later" directive.
- **Learned**: No "scheduled interview date" field exists anywhere in the data model — `interview_scheduled` is only an application status. The "prochaine interview" KPI derives from the most recent `interview_scheduled` entry in `statusHistory`, not a real calendar date. `share-card-content.ts` stays untouched (still used by `/share/dashboard/page.tsx` + `og/route.tsx`) even though 2 of its exports are now dead — hybrid refactor rule says don't touch untouched files, logged to backlog instead.
- **Verified**: `pnpm --filter app lint` (0 warnings), `pnpm --filter app test` (77/77 files, 254/254 tests), `pnpm --filter app build` (succeeds, `/dashboard` bundle now 1.44 kB vs. the old chart-heavy page).

## 2026-07-10 — fix EACCES on /workspace/.data mkdir (ad hoc · push-to-github)

- **Did**: Committed and pushed the fix already sketched on 2026-07-09: `docker/api.Dockerfile` now takes `HOST_UID`/`HOST_GID` build args and runs `chown -R` on `/workspace/.data` at build time; `docker-compose.yml` passes those args through to the api build. Verified with a local `docker build` + `docker run -u 1000:1000 ... mkdir -p /workspace/.data/probe` — succeeds where it previously threw `EACCES`.
- **Why**: The runner stage built as root leaves `/workspace` root-owned while the container runs as a non-root UID; any runtime `mkdirSync` under `/workspace` (the auth JSON state store) failed in prod.
- **Learned**: Chowning the specific subdirectory needed at runtime (`.data`), rather than the whole `/workspace` tree, keeps the fix cheap and targeted.
- **Open**: The longer-term move to a Postgres-backed auth store (flagged 2026-07-09) is still open and separate from this fix.

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
- **Why**: Creating a candidature triggered `"No endpoints found for mistralai/mistral-small-2603"`. Root cause: `data_collection: "deny"` in the request body acts as an _endpoint capability filter_ (only route through providers that advertise ZDR support) — neither the Mistral nor Venice endpoint advertises it, so OpenRouter found no valid route. ZDR is enforced at the OpenRouter account level ("Always enforce ZDR" toggle), not per-request.
- **Learned**: OpenRouter ZDR operates on two separate layers: (1) **account-level** — "Always enforce ZDR" in the web UI applies to every request from that API key transparently; (2) **per-request `data_collection: "deny"`** — this is a _routing filter_, not a ZDR signal, and blocks routing when no endpoint advertises ZDR support. Never add `data_collection: "deny"` to requests when account-level ZDR is enabled — it is redundant and breaks routing. Always include the response body in error messages; `404 Not Found` alone is not enough to diagnose OpenRouter failures.
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
- **Learned**: La colonne CSS grid pour les compétences est incompatible avec les parseurs ATS — le rendu inline `·` est la seule approche ATS-safe. Supprimer les soft skills du prompt évite que l'AI les génère alors que le template ne les affiche plus.
- **Open**: `cv-generation.service.ts` CV_SYSTEM_PROMPT candidat à extraction dans fichier séparé. DOCX templates non alignés sur format compact formation.

## 2026-06-02 — compétences structurées par catégories (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602170000]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602170000/03-implement]]
- **Did**: 3 fichiers modifiés — `packages/types/src/index.ts` : `SkillCategory` + `categories?` dans `CVDocumentContent.skills` ; `cv-generation.service.ts` : import `SkillCategory`, `RawCvJson.skills.categories`, CV_SYSTEM_PROMPT 3 catégories (outils/métier/transverses), `normalizeSkillCategories()`, `buildSkills()` (hard = concat catégories) ; `cv-html-templates.ts` : `skillsSection` computed (catégories si présentes, fallback flat), placement après Profil/avant Expériences, `.skills-section border-top`. 259 tests passés, lint vert.
- **Why**: Section compétences sous forme de bloc structuré par catégories pour meilleure lisibilité ATS et recruteur.
- **Learned**: Ajouter `categories?` optionnel préserve la compat Puck sans toucher aucun mapper. `buildSkills()` centralise la logique hard=flat(categories) pour que l'éditeur Puck continue de recevoir une liste plate.
- **Open**: Placement des compétences dans le Puck editor reste après les expériences (old mapping) — divergence acceptable non bloquante.

## 2026-06-02 — fix deployment data loss — koklo-infra volume path (stage 03 · [[workflows/runs/analyze-design-dev-review-20260602180000]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260602180000/03-implement]]
- **Did**: 1 ligne modifiée dans `koklo-infra/stacks/cvforge/docker-compose.yml` — volume mount api_data corrigé de `/workspace/apps/api/.data` vers `/workspace/.data`.
- **Why**: WORKDIR dans `docker/api.Dockerfile` (runner stage) est `/workspace` → `process.cwd()` = `/workspace` → tous les stores écrivent dans `/workspace/.data/` mais le volume était monté ailleurs → perte totale des données à chaque `--force-recreate`.
- **Learned**: Toujours vérifier que le chemin du volume Docker correspond exactement à `process.cwd()/.data` pour les stores file-based. Vérifier aussi le WORKDIR du Dockerfile runner avant de définir les volumes dans docker-compose.
- **Open**: Données existantes dans la couche éphémère du container seront perdues au prochain déploiement — recommander `docker cp cvforge-api-1:/workspace/.data/ ./backups/` sur VPS20 avant le redéploiement.

## 2026-06-03 — rendu CV formations et centres d'intérêt (ad hoc · run-agent)

- **Context**: ad hoc · last sprint [[sprints/sprint-017]] · last run [[workflows/runs/analyze-design-dev-review]]
- **Did**: Étendu `CVDocumentContent` avec `education.description` et `interests`, mis à jour génération, aperçu, Puck, PDF et DOCX, retiré le séparateur avant Compétences quand Profil est présent.
- **Why**: Le CV généré devait afficher les formations comme les expériences, reprendre les centres d'intérêt du profil et supprimer la barre entre Profil et Compétences.
- **Learned**: Les centres d'intérêt existent déjà dans `BaseProfile.sections`; la bonne réinjection CV vient du `promptProfile`, pas des `localFields` réservés aux données personnelles.
- **Open**: None.

## 2026-06-03 — suivi candidature detail (stage 03 · [[workflows/runs/analyze-design-dev-review-20260603130216]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260603130216/03-implement]]
- **Did**: Ajouté le header de suivi, `returnTo` sur la route status, tests header/page/route, et split header + historique pour ramener `candidature-detail-tabs.tsx` à 386 lignes.
- **Why**: L'utilisateur doit modifier le suivi depuis la candidature consultée, avec validation backend existante et retour au bon contexte.
- **Learned**: La route status pouvait rester inchangée côté API ; seul le proxy Next avait besoin d'un retour configurable.
- **Open**: None.

## 2026-06-03 — retrait Puck Editor (stage 03 · [[workflows/runs/analyze-design-dev-review-20260603145814]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260603145814/03-implement]]
- **Did**: Supprimé `@puckeditor/core`, les loaders/adapters Puck, remplacé le CV par formulaire + preview, ajouté `TemplateLayoutEditor`, et renommé le contrat en `TemplateLayoutData`.
- **Why**: L'éditeur externe était lourd et cassait le design ; un éditeur par blocs métier couvre le besoin admin sans nouvelle dépendance.
- **Learned**: Extraire `template-page-components.tsx` était nécessaire pour ramener la page admin sous le warning §9 après modification.
- **Open**: `letter-editor.tsx` reste volumineux mais non touché ; à splitter lors d'une prochaine évolution LM.

## 2026-06-03 — diagnostic deploy-cvforge GHCR pull reset (ad hoc · run-agent)

- **Context**: ad hoc · last sprint [[sprints/sprint-017]] · last run [[workflows/runs/analyze-design-dev-review]]
- **Did**: Analysé l'échec `make deploy-cvforge` dans `koklo-infra`; le playbook exécute un `docker compose pull` sans retry et l'erreur vient d'une coupure TCP pendant le pull GHCR.
- **Why**: Identifier si l'échec venait de l'application CVForge, du playbook Ansible, du registre Docker ou du réseau VPS.
- **Learned**: `read tcp [2a02:...]->[2606:50c0:8000::154]:443: connection reset by peer` indique une connexion IPv6 vers GHCR interrompue pendant un téléchargement de couche, pas une erreur applicative ni un problème d'authentification.
- **Open**: Ajouter des retries Ansible autour de `docker compose pull` dans `koklo-infra` si l'instabilité réseau se répète.

## 2026-06-10 — réinstallation Impeccable

- **Did**: Réinstallé la dernière version de `pbakaus/impeccable` avec le CLI `skills` et mis à jour son verrouillage local.
- **Why**: La première tentative pendant l'upgrade avait échoué à cause d'un jeton npm invalide.
- **Learned**: Le CLI installe désormais le skill partagé sous `.agents/skills/impeccable`; l'ancienne source `anthropics/claude-code#plugins/frontend-design` n'est plus une branche Git valide.
- **Open**: Mettre à jour le framework `upgrade-project` quand une nouvelle source officielle pour `frontend-design` sera disponible.

## 2026-06-10 — structuration predictive des competences CV (stage 03 · [[workflows/runs/analyze-design-dev-review-20260610104253]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260610104253/03-implement]]
- **Did**: Extrait prompt et normaliseurs, adapte le contrat de competences, ajoute limites, alias, deduplication et tests.
- **Why**: La generation existante imposait 3 categories et 6-10 items, donc un resultat rigide et souvent incoherent.
- **Learned**: Accepter `category` en entree tout en stockant `label` rend la sortie IA tolerante sans migrer le modele interne.
- **Open**: Corriger les exclusions des gates globales de format et couverture.

## 2026-06-10 — rationalisation frontend desktop (stage 03 · [[workflows/runs/analyze-design-dev-review-20260610150733]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260610150733/03-implement]]
- **Did**: Ajouté les redirections dashboard, densifié le shell/candidatures et converti les éditeurs CV/LM en split view.
- **Why**: Le flux principal et les documents sont utilisés sur ordinateur; l'ancienne composition mobile-first créait trop de défilement.
- **Learned**: Le split CSS existant pouvait être réutilisé; l'éditeur LM devait être découpé avant toute évolution.
- **Open**: Décider du devenir du wizard onboarding sans route principale.
## 2026-06-10 — fidélité aperçu PDF (stage 03 · [[workflows/runs/analyze-design-dev-review-20260610153104]])
- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260610153104/03-implement]]
- **Did**: Extrait `@cvforge/document-renderer` et branché API Puppeteer, aperçu CV et aperçu LM sur la même source.
- **Why**: Supprimer définitivement la divergence entre rendu écran et fichier téléchargé.
- **Learned**: Les marges `@page` doivent avoir un équivalent `@media screen` pour l’aperçu iframe.
- **Open**: None.

## 2026-07-09 — US-074 implementation (stage 03 · [[workflows/runs/analyze-design-dev-review-20260709210000]])
- **Context**: [[sprints/sprint-020#US-074]] · [[workflows/runs/analyze-design-dev-review-20260709210000/03-implement]]
- **Did**: Extracted a shared `auth-column.tsx` primitive set (paperTokens-backed) and rewrote `login/page.tsx`, `login/check-email/page.tsx`, `register/invitation/page.tsx` onto a fixed 420px centered column with no card chrome around forms.
- **Why**: The three auth pages duplicated the same inline `<main>` wrapper with hardcoded colors/fonts diverging from `paperTokens`, and stretched full-width on desktop.
- **Learned**: Preserving existing element `id`/`name`/copy exactly let all 6 pre-existing test files pass unmodified — only the visual layer changed. JSX files under this app's build config need an explicit `import React` even with no direct `React.*` usage.
- **Open**: US-075 (dashboard) is next in sprint 020.

## 2026-07-10 — US-076: day-grouped notifications feed (stage 03 · [[workflows/runs/analyze-design-dev-review-20260710123525]])
- **Context**: [[sprints/sprint-020#US-076]] · [[workflows/runs/analyze-design-dev-review-20260710123525/03-implement]]
- **Did**: Added `apps/app/app/notifications/notification-groups.ts` — pure `groupNotificationsByDay()` (today/yesterday/older buckets, unread-first sort per bucket, empty buckets omitted) plus 4 unit tests. Extracted `NotificationArticle` from the inline `.map()` in `page.tsx` (now needed at a nested loop level). Moved the "Préférences email" card after "Fil d'activité" and densified its two checkbox rows. Added `aria-live="polite" role="status"` to the unread-count `<strong>`.
- **Why**: AC required unread-first ordering, day-bucket grouping, and repositioning an already-shipped card — all derivable from existing `readAt`/`createdAt` fields with zero API changes.
- **Learned**: Extracting a small render component (`NotificationArticle`) is the correct move the moment existing inline JSX starts rendering inside a newly-added nested loop — duplicating the markup per day-section would have violated the no-new-duplication refactoring rule.
- **Verified**: `pnpm --filter app test` 259/259 (78 files, +2 files/+2 tests vs. pre-task 254/77), `pnpm --filter app lint` 0 warnings, `pnpm --filter app build` succeeds (`/notifications` 1.42 kB).
- **Open**: US-077 (onboarding wizard split) is the last task of sprint 020.

## 2026-09-15 — CVForge v2 front-end `apps/web` (ad hoc, user request)
- **Context**: Owner found `apps/app` confusing for demo audiences (mobile-first layout). Asked for a separate, simpler desktop-first app built on shadcn templates, with a real admin CRUD and editable offers. [[decisions/ADR-008-web-v2-nextjs16-tailwind-shadcn]]
- **Did**: Scaffolded `apps/web` with `shadcn init -t next` + `dashboard-01`. Routes: `/dashboard`, `/offers`, `/offers/new`, `/offers/[id]`, `/offers/[id]/edit`, `/offers/[id]/cv`, `/offers/[id]/letter`, `/profile`, `/credits`, `/notifications`, `/admin/users`, plus auth pages. API: `GET /applications/:id/offer`, `PATCH /applications/:id`, `POST /applications/:id/re-extract`, `AdminModule` with `GET|PATCH|DELETE /admin/users`. Refactored touched files: de-duplicated `importFromUrl/Text`, session checks in `ApplicationsController`, admin user directory (`credits/admin-user-directory.ts`), `PrivacyService.purgeAccount`.
- **Learned**: shadcn CLI now scaffolds **Next 16** (`proxy.ts`, `PageProps` needs `next typegen` before `tsc`). TanStack Table v9 needs features registered via `tableFeatures()`; `row.getVisibleCells()` only exists with `columnVisibilityFeature` (use `getAllCells()`). `eslint-plugin-react-hooks` flags setState in effects — use render-time state adjustment or `useSyncExternalStore`. Admin credit grants require a non-empty note.
- **Verified**: api 42 files / 270 tests green + lint + tsc; web lint, typecheck, 7 unit tests, `next build`; browser run against a copy of `.data` (dashboard, offer edit with source link, CV editor preview, admin credit grant); `docker/web.Dockerfile` image built and smoke-tested.
- **Open**: magic link redirects follow the API `NEXT_PUBLIC_APP_URL` (still v1 in prod compose). PDF export needs the puppeteer service (not exercised locally).

## 2026-09-15 — Fix CV import (PDF) returning an empty profile
- Root cause: `extractPdfTextHeuristically` read the raw PDF as latin1; compressed streams gave binary noise, the AI returned empty JSON, the API still answered 200 and charged 2 credits.
- Fix: `pdf-text.extractor.ts` uses `pdfjs-dist@4` (ESM loaded via Function-wrapped import because the API compiles to commonjs; falls back to `import()` under vitest). Import now 422s when nothing is extracted, checks balance before the AI call and charges credits only on success.
- Lesson: pdfjs-dist ≥5 needs Node ≥22.13 — the API Docker image is Node 20.

## 2026-09-15 — Multi-profils dans `apps/web` (ad hoc, user request)
- **Context**: v2 `/profile` edited only the active profile, whereas vision §5.1/§5.3 and US-081 plan several base profiles.
- **Did**: front-only on top of `GET|PUT /profiles` (whole-registry rewrite). `lib/profile.ts` → `loadRegistry`/`writeRegistry`; pure `pickProfile`, `duplicateBaseProfile`, `countCompletedSections` in `lib/profile-model.ts` (+3 tests). Server actions `saveProfile` (no longer changes the active profile), `createProfile`, `duplicateProfile`, `deleteProfile` (keeps ≥1, reassigns default), `setDefaultProfile` via one `mutateRegistry` helper. UI: `ProfileWorkspace` = `ProfileList` (240px column, dropdown actions, create dialog, unsaved-changes guard) + `ProfileForm` keyed by profile id; identity/import extracted to `profile-identity-card.tsx`. "Actif" = "par défaut". Offer detail: `OfferDocuments` select passes `profileId` to `generateDocument`.
- **Verified**: web lint, typecheck, 10 unit tests; browser: create, edit+save (default unchanged), guard dialog, set default, delete default (fallback), offer select rendered. Generation with a secondary profile NOT run (credits).
- **Open**: API has no per-application `profileId`; the choice is not remembered. US-081 criteria (accordions, Langues, Préférences) not addressed → boxes left unchecked.

## 2026-09-15 — Local OCR fallback for scanned CV PDFs (ADR-009)
- Owner chose local OCR over vision AI: a CV image carries last name/e-mail/phone, forbidden by vision §15.3.
- `renderPdfPages` (pdfjs + @napi-rs/canvas, white background) → `ocr.extractor.ts` (tesseract.js 7, fra+eng from `@tesseract.js-data/*` packages) when the text layer is < 120 chars; then the usual pseudonymisation + AI call. Cap: 4 pages; ~4 s for one page incl. worker start.
- Gotchas: tesseract.js 7 `{ code, data }` langs are broken (worker initialises with the data) → copy trained data into one tmp `langPath`. pdfjs canvases are transparent (black once flattened) → fill white before render. `@napi-rs/canvas` `new Image()` loads async; use `loadImage`. OCR unit test uses a PNG fixture, not canvas text (system fonts vary across CI).

## 2026-09-15 — Last-name detection for scanned CVs
- `cv-pseudonymizer.ts` (extracted from `cv-import.service.ts`): last name from header ("Prénom NOM" / "NOM Prénom", compound, particles skipped) + e-mail local part + LinkedIn slug; masking is whole-word, accent-insensitive, and in the first 8 lines tolerates 1 edit or truncation ≥60% (OCR read "JÉMIMA EGLA" as ": GLA"). A handle token is unmasked only if it leads its handle and matches the header first name; firstName hint is dropped if it is a masked name.
- Old code used ASCII `\b` (broke on accented names) and exact last name only.
- Trade-off: over-masking accepted (e.g. a header line "Martineau Conseil" masks "Conseil"). Fuzzy matching stays out of the body to protect words like "Dupond".

## 2026-09-15 — Profil mémorisé par candidature (API)
- **Did**: `DraftApplication.profileId?: string | null`; `PUT /applications/:id/profile { profileId }` → `ApplicationsService.setProfile` (400 if empty, 404 if unknown profile, null resets, `updatedAt` untouched). Profile ids come from `PROFILES_STORE` injected through `ApplicationsModule` (imports `ProfilesModule`). Web: select on offer detail persists via `setOfferProfile`; `generateDocument` always uses the stored profile (fallback to default when absent or deleted), so CV/letter pages use it too.
- **Learned**: `@cvforge/types` resolves to `dist/` for web typecheck (`import` condition wins) → run `pnpm --filter @cvforge/types build` after changing a type.
- **Verified**: api tsc + lint, applications tests 47/47 (+3); web typecheck, lint, 10 tests; browser: choice persisted across reload, stale id after profile deletion falls back. Full api suite had 4 failures in `cv-pseudonymizer.test.ts`, untracked work from another session.

## 2026-09-15 — Rebrand CVSpark apps/web (ad hoc)
- **Did**: Tokens CVSpark dans `globals.css`, `TableFrame` partagé, `PendingContent` + prop `spark` sur ActionButton/SubmitButton, `formatCredits`/`creditCostLabel` (coûts lus depuis `AI_CREDIT_COSTS`), `loading.tsx`/`error.tsx`/`not-found.tsx`, wording CVSpark.
- **Learned**: Next 16 `error.tsx` reçoit `retry` (pas `reset`) ; les utilitaires custom Tailwind v4 se déclarent via `@utility`.

## 2026-09-15 — Traduction EN/FR des CV et lettres (ad hoc)
- **Did**: `language?: Locale` sur `CVDocumentContent`/`LetterDocumentContent`, source de version `"translation"`, `isLocale`. API `POST /applications/:id/{cv,letter}/translate { targetLanguage }` → `CvGenerationService.translateCv/translateLetter` (mêmes crédits que la génération ; helpers purs dans `cv-generation.translation.ts` : seules les parties traduisibles partent au LLM — identité, entreprise, signature restent côté API ; une liste renvoyée avec un autre nombre d'items garde l'original). Les prompts de génération imposent désormais `offerContext.language` pour tout le document ; `documentLabels(locale)` (document-renderer) localise les titres PDF/DOCX. Web : `TranslateDialog` dans les deux éditeurs (désactivé si modifications non enregistrées).
- **Learned**: `useDocumentEditor` garde son draft en `useState(initial)` → un `router.refresh()` n'affiche pas un nouveau contenu IA. Les pages re-keyent l'éditeur sur `latestAiVersionId(versions)` (`lib/document-versions.ts`), ce qui corrige aussi « Régénérer ». Les normalizers `normalizeUpdated*` suppriment les champs inconnus : penser à y propager tout nouveau champ.
- **Verified**: `pnpm lint`, `pnpm test` (api 307, web 14, renderer 6…), `pnpm build` verts. Pas encore testé en navigateur avec un vrai appel LLM.

## 2026-09-16 — Refonte du site vitrine `apps/landing` (ad hoc)
- **Did**: `apps/landing` repassé sur la stack de `apps/web` (Next 16.3.4, Tailwind v4, shadcn `radix-nova`, lucide, `motion`) ; tokens CVSpark dupliqués depuis `apps/web/app/globals.css`. Sections hero / constat / fonctionnement (diagramme `AnimatedBeam`) / bento / vitrine à onglets / tarifs / FAQ / CTA + page « Notre histoire ». i18n maison : `app/[locale]`, dictionnaires typés `content/{fr,en}.ts` (`content/types.ts`), `proxy.ts` négocie `Accept-Language`, slug localisé `/fr/histoire` ↔ `/en/story` via rewrite + redirects. Tarifs dérivés de `creditPacks`/`AI_CREDIT_COSTS` (`lib/pricing.ts`). SEO : metadata par locale, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`. Image standalone (`docker/landing.Dockerfile`), ADR-010.
- **Learned**: `NEXT_PUBLIC_*` est figé au build alors que la prod ne fournit ces variables qu'au runtime → les liens vers l'app passent par le route handler `app/login/route.ts` qui lit `APP_URL` par requête (`export const dynamic = "force-dynamic"`). Le registre Tailark (`oss-tailark.com`) est injoignable depuis cet environnement (aucun code HTTP) ; Magic UI via le CLI shadcn passe. Les composants Radix ne réagissent pas à un `.click()` en JS (il faut un vrai clic). Ignorer `.next*/**` (pas seulement `.next/**`) dans eslint/prettier, sinon un `NEXT_DIST_DIR` personnalisé fait exploser le lint.
- **Captures**: compte démo `cvspark-demo@yopmail.com` (invitation admin → lien à copier, pas d'email), profil fictif « Léa Moreau » + 4 candidatures d'annonces fictives ; captures 1440×900 clair/sombre → `public/screenshots/{light,dark}/*.webp`. Masquer l'overlay dev (`nextjs-portal`) et remplacer l'email de démo dans le DOM avant capture.
- **Verified**: prettier, eslint, tsc, 21 tests, `next build` (FR/EN statiques, OG images) ; navigateur : redirection de locale, thèmes, 400 px sans débordement horizontal.

## 2026-09-17 — Paiements & offres de crédits, PR1 : socle Postgres/Drizzle (ad hoc)
- **Did**: ADR-011. `apps/api/src/database/` (config, client node-postgres, `DatabaseModule` global sous le token `DATABASE`, `/ready`, `migrate.main.ts` lancé avant `main.js` dans `docker/api.Dockerfile`), migrations SQL dans `apps/api/drizzle/`, table `data_imports`. Alias Postgres par environnement `${POSTGRES_HOST}` (Dokploy) utilisé par `DATABASE_URL` et `db_backup`. Plan complet : 8 PRs (ledger → offres admin + sync Stripe → checkout/webhook → back-office → page crédits → landing → mise en service).
- **Learned**: garder les versions stables `drizzle-orm@0.45.2` / `drizzle-kit@0.31.10` (la doc Context7 décrit la 1.0 bêta, format de migrations différent). Les tests de stores tournent sur PGlite avec les vraies migrations (`database/testing/test-database.ts`). En local un autre Postgres écoute déjà sur 55432 : lancer les conteneurs de test avec `-p 127.0.0.1::5432`.
- **Verified**: 375 tests API, eslint, `tsc` build, migrations appliquées deux fois (idempotent) sur un vrai Postgres 16, `docker compose config` valide.

## 2026-09-17 — Paiements & offres de crédits, suite (même PR)
- **Did**: ledger de crédits en Postgres (`credit_balances` verrouillée `FOR UPDATE`, clé d'idempotence unique, import unique de `credits-state.json` au démarrage) ; `CreditsService` devenu asynchrone (tous les appelants attendent). Module `offers` (CRUD admin `/admin/credit-offers`, catalogue `/public/credit-offers`, sync Stripe Product/Price, une seule offre mise en avant via index unique partiel). Billing réécrit sur le SDK `stripe` (Checkout sur le Price de l'offre, commande `credit_orders` figée, webhook `constructEvent` rejouable). `apps/web` : `/admin/offers`, page `/credits` dynamique + historique d'achats ; landing : tarifs depuis l'API (ISR 300 s, aucun prix si l'API tombe). Helper `auth/request-session.ts` et hook `use-action-mutation` factorisés.
- **Learned**: `@cvforge/types` est résolu via `dist` par vitest dans l'API → `pnpm --filter @cvforge/types build` après avoir modifié les types. `creditPacks` reste (déprécié) pour l'ancienne `apps/app`. Pas de `payment_method_types` avec Checkout (bonnes pratiques Stripe). Le prix d'un Price Stripe est immuable : nouveau Price + `default_price` puis archivage de l'ancien.
- **Verified**: 424 tests API, 30 web, 25 landing, 12 types ; lint/typecheck ; builds api/web/landing ; API démarrée sur un vrai Postgres (migrations, seed, import, `/ready`, catalogue public). Non vérifié : un paiement réel en sandbox Stripe et le parcours navigateur (pas de clé sandbox en local).

## 2026-09-17 — US-096 (hotfix §3.2) puis US-083 (solde OpenRouter) — sprint 022
- **Did**: US-096 — supprimé la promotion user→admin : `AuthService.updateAccountRole` devient `demoteAccountToUser` (refuse tout rôle ≠ `user`), `PATCH /admin/users/:email` ne prend plus que `{role:"user"}`, et côté `apps/web` le select de rôle du dialogue d'édition devient un `DemoteUserDialog` de confirmation (visible seulement sur un admin). US-083 — `src/ai/openrouter-balance.{config,service}.ts` : lecture de `GET {baseUrl}/credits`, cache mémoire TTL 5 min, `stale:true` sur échec avec valeur en cache, `null` sinon ; exposé sous le token `OPENROUTER_BALANCE_SERVICE`.
- **Why**: La faille §3.2 était exploitable en production (l'UI offrait « Administrateur » dans une liste déroulante) ; elle passait avant tout le reste de E16/E17.
- **Learned**: Le correctif fort n'était pas une garde mais la **réduction du contrat de store** — `updateRole(email, role)` → `demoteToUser(email)` : la promotion n'est plus refusée, elle n'est plus exprimable. Cela a aussi tué la branche morte `if (role === "admin") consumeBootstrap(tx)`.
- **Learned**: `vitest` ne type-check pas — un test utilisant une méthode `private` passe puis casse `pnpm build` (`tsc`). Construire la session de test via le vrai parcours magic link plutôt que `serializeSessionCookie`.
- **Learned**: `resolveOpenRouterConfig()` **jette** si la clé manque ; un nouveau service IA doit au contraire se désactiver proprement (clé vide) sinon `app.module.boot.test.ts` casse. Horloge injectable (`now: () => number`) pour tester un TTL sans faux timers.
- **Verified**: 513 tests API (+13), lint monorepo, `tsc` API, build `apps/web`, boot test relancé **sans** `OPENROUTER_MANAGEMENT_API_KEY`. Couverture du nouveau code : 98,7 % lignes / 92,3 % branches ; `admin-users.controller.ts` 100 %. Non vérifié : lecture réelle contre OpenRouter (pas de clé de management provisionnée) et parcours navigateur (pas de stack cvforge lancée).
- **Open**: `pnpm build` échoue sur `apps/app` (v1 gelée) — `CreateCheckoutSessionRequest["packId"]` a disparu lors de la refonte des offres. Panne **préexistante**, sans rapport avec ces changements.

## 2026-09-17 — US-084 (alerte solde) + US-085 (garde-fou achat) — sprint 022
- **Did**: Nouveau module `src/metrics/` (16e) : `AdminMetricsController` (`GET /admin/metrics/openrouter-balance`) et `OpenRouterBalanceAlertService` (`setInterval` quotidien + vérification au démarrage, fan-out à tous les admins). Ajout du type `openrouter_low_balance` et de `NotificationsService.createOncePerDay()`. US-085 : garde dans `CheckoutService` **avant** `orders.createPending`, nouveau seuil `OPENROUTER_BALANCE_CRITICAL_THRESHOLD` (défaut 0), endpoint `GET /billing/purchase-availability`, bandeau + boutons désactivés sur `/credits`.
- **Why**: Le système de notifications n'avait aucun chemin d'écriture (tout était dérivé des candidatures à la lecture) ; il fallait le premier, et le rendre générique plutôt que taillé pour cette alerte.
- **Learned**: La colonne `notifications.type` n'a **pas** de contrainte CHECK — ajouter un type de notification ne demande aucune migration (contrairement à `auth_accounts.role`).
- **Learned**: Placer le garde-fou avant `createPending` évite des commandes `pending` orphelines ; le tester impose de vérifier `orders.listForUser()` vide, pas seulement l'exception.
- **Learned**: Deux tests d'achat dans le même `it` échouent sur l'index unique `credit_orders_stripe_checkout_session_id_unique` si le mock Stripe renvoie deux fois `cs_test_1` — changer l'id entre les appels.
- **Learned**: Ajouter un module à `app.module.ts` casse **`src/app.module.test.ts`**, qui compare la liste d'imports à l'identique (en plus du boot test). Penser aux deux.
- **Learned**: `vitest` tolère un typage de `mock.calls.map(([draft]: [T]) => …)` que `tsc` refuse (tuple vs `any[]`) — indexer `call[0] as T`.
- **Decided**: échec **ouvert** sur le garde-fou (supervision HS ⇒ la vente passe) mais un solde périmé connu vide bloque ; seuil critique séparé du seuil d'alerte.
- **Verified**: 535 tests API (+22), 34 web, lint monorepo, `tsc` API, build `apps/web`, boot test sans la clé de management. Couverture : service d'alerte 100 %, contrôleur métriques 100 %, `checkout.service.ts` 100 %, service de solde 96,4 %. Non vérifié : parcours navigateur du bandeau et lecture réelle OpenRouter.

## 2026-09-17 — E16 fini (US-086/087) + E17 complet (US-089→095) — sprints 022/023
- **Did**: US-086/087 — module `metrics` étendu (`PgMetricsStore`, `MetricsService`, `/admin/metrics`, export CSV), écran `apps/web` découpé par carte. Helpers CSV extraits de `templates.service.ts` vers `src/shared/csv.ts`. E17 — table `admin_audit_log` (+ `AdminAuditModule` autonome), colonnes `status` et `sessions_valid_from` sur `auth_accounts` (migration `0011`), `SessionStateMiddleware` global, purge RGPD élargie (entretiens supprimés, `credit_orders` anonymisées, cible du journal scrubée), `PgAdminUsersStore` (filtre/tri/pagination SQL), endpoint de détail, écrans `/admin/users/[email]` et `/admin/audit-log`.
- **Learned**: appliquer un invariant de session dans un **middleware** plutôt que dans `requireSession` : ce dernier est synchrone et le rendre asynchrone imposait de toucher ~65 points d'appel dans 14 contrôleurs. Un middleware = un seul endroit asynchrone, une lecture indexée par requête.
- **Learned**: premiers agrégats SQL du repo. Dans une sous-requête Drizzle, `.as()` s'applique aux agrégats (`count()`, `max()`) mais **pas** à une colonne — retirer l'alias et référencer `subquery.column`. `union()` de `drizzle-orm/pg-core` déduplique, ce qui évite un `db.execute` brut dont la forme de retour diffère entre node-postgres et PGlite.
- **Learned**: un module autonome (`AdminAuditModule`) casse le cycle `AdminModule` ↔ `PrivacyModule` quand deux modules doivent écrire dans la même table.
- **Learned**: ajouter un champ à `AuthAccount` casse tous les tests qui comparent un compte avec `toEqual` (3 fichiers) — préférer `toMatchObject` pour un enregistrement susceptible de grandir.
- **Learned**: un test RGPD « aucune donnée résiduelle » doit **pouvoir échouer** : le scan de toutes les colonnes texte du schéma est précédé d'une assertion qu'il trouve bien des lignes *avant* la purge.
- **Verified**: 592 tests API (+35), 34 web, lint monorepo, `tsc` API, build `apps/web` (toutes les routes admin compilent). Non vérifié : parcours navigateur, axe/contraste outillé (absents de `apps/web`), lecture réelle OpenRouter.
- **Open**: `GET /credits/admin/users` (doublon) conservée car encore utilisée par `apps/app` gelée — décision propriétaire attendue.

## 2026-09-18 — Incident : API staging KO après le push E17 (import circulaire)
- **Did**: `SessionStateMiddleware` injectait `Pick<AuthService, …>` (type structurel, aucun token) **et** `auth.service.ts` importait le message de suspension depuis le middleware → cycle. Corrigé : `@Inject(AuthService)` explicite + messages extraits dans `src/auth/session-messages.ts`.
- **Why**: Le conteneur API crashait au démarrage (`UndefinedDependencyException`), Traefik n'avait plus de route, `/health` renvoyait **404** (pas 502), et le smoke test du déploiement échouait.
- **Learned**: **les 593 tests ne pouvaient pas l'attraper.** Vitest résout le graphe en ESM ; le build CommonJS laisse la classe `undefined` au moment d'évaluer les décorateurs. Un test `NestFactory.create` + `app.init()` en TS passe alors que `node dist/apps/api/src/main.js` échoue. Seul le binaire compilé reproduit le bug.
- **Learned**: méthode de diagnostic qui a marché — Postgres 16 jetable en Docker, `migrate.main.ts` (OK, exit 0), puis boot du **vrai** `dist/apps/api/src/main.js` : l'erreur est apparue immédiatement. Ne pas se fier à `dist/main.js`, c'est un reliquat : tsc émet dans `dist/apps/api/src/` (cf. `CMD` du Dockerfile).
- **Learned**: ma première hypothèse (wildcard `"*"` invalide avec Express 5) était **fausse** — vérifiée en testant les deux syntaxes, `/health` répondait 200 dans les deux cas. La syntaxe nommée `{*splat}` a été conservée (conforme à la doc Nest 11) mais ce n'était pas la cause.
- **Verified**: binaire compilé démarré contre un vrai Postgres → `/health` 200, `/ready` 200, `/admin/users` et `/credits/me` 401 sans session. 593 tests, lint, build.
- **Open**: le pipeline déploie sans jamais avoir démarré l'image (smoke test **après** `tofu apply`). Noté au backlog.

## 2026-09-19 — Launch pricing + welcome credits (ADR-012)
- Packs are seeded by migration `0012_launch_pricing` (Starter/Pro archived, never deleted). Seeds only exist before `testDatabase.reset()`, so they are tested in `offers.seed.test.ts`.
- Welcome credits: `AuthService.onAccountCreated` listener registered by `WelcomeCreditsListener` (credits → auth dependency direction), idempotency key `welcome:<email>`.
- `CREDITS_PER_APPLICATION` / `estimateApplications` / `WELCOME_CREDITS` live in `@cvforge/types` (built to dist: rebuild the package before app tests).
- Do NOT run `pnpm format` at the root: it rewrites hundreds of untouched files (api and web are not Prettier-formatted). Format only the touched landing files.

## 2026-09-21 — Retarification de l'entretien à la minute (ADR-017)
- Une candidature complète vaut désormais **17 crédits** (1 + 3 + 3 + 10) et inclut l'entretien de 10 min et son rapport ; packs 90 / 350 / 870 aux mêmes prix, crédits offerts 16 → 36.
- **TDZ** : `CREDITS_PER_INTERVIEW_MINUTE` doit être déclarée *juste avant* `AI_CREDIT_COSTS` dans `packages/types/src/index.ts`. Une `const` déclarée après la table est dans sa zone morte temporelle et le module lève un `ReferenceError` à l'import — alors que la fonction `interviewSessionCost`, elle, est hoistée et ne signale rien.
- **Montant variable** : `assertSufficientCredits(action, email, amount?)` et `ConsumeCreditsInput.amount?` sont des ajouts *optionnels*, donc les `Pick<CreditsService, …>` de `cv-generation.translate.ts` et `CreditsServiceContract` ne bougent pas et les 5 autres appelants non plus. Valider le montant (`resolveCost`) : c'est le seul chemin par lequel un appelant écrirait un nombre arbitraire au grand livre.
- **Bug trouvé** : `apps/web/app/api/interviews/sessions/route.ts` laissait tomber `durationMinutes`. Le BFF web est un point de perte silencieuse — un champ accepté par l'API et envoyé par le client peut ne jamais transiter. Vérifier le relais quand un champ semble inerte côté produit.
- Migration `0015` fait un `UPDATE` sur place des offres au lieu d'archiver/réinsérer comme `0012` : le prix ne bougeant pas, `stripe_price_id` reste valide et il n'y a **aucune fenêtre de 503** sur le paiement. Préférer ce motif dès que seuls les crédits ou les textes changent.
- **Verified**: 853 tests API, 201 web, 25 landing, 17 types ; lint et build monorepo verts. Non vérifié : parcours navigateur réel, achat Stripe de test, resynchronisation Stripe.

## 2026-09-22 — Cookie fantôme et persistance des liens magiques (PR #28 refaite)
- **PR #28 fermée, pas mergée** : le diagnostic tenait encore 6 jours après, mais le code était périmé — l'auth était passée du store fichier (`auth-account-store.ts`, supprimé) à PostgreSQL (`auth.pg-store.ts`). Leçon : une PR d'auth qui dort une semaine pendant une migration de store est à refaire, pas à rebaser.
- **Bug cookie** : un navigateur envoie **une entrée `Cookie` par cookie stocké**, et la RFC 6265 met le plus ancien en premier. Un résidu du même nom (autre domaine / autre chemin) masquait donc la session valide à *chaque* requête, sans échappatoire autre que vider les cookies. Ne jamais prendre la première occurrence d'un nom de cookie : essayer tous les candidats et garder le premier qui vérifie (`SessionCookieCodec.read`).
- **Liens magiques** : table `auth_magic_links` (migration `0018`). Consommation = **un seul `DELETE ... RETURNING`** filtré sur `expires_at > now` — mono-usage sans transaction, deux clics simultanés ne peuvent pas ouvrir deux sessions. Pas de colonne `consumed_at` : un lien consommé ou expiré est *supprimé* (personne ne le lit et il porte une adresse e-mail). `purgeUserData` emporte les liens en attente.
- Le `pruneExpiredMagicLinks` du service est du ménage : son échec est **loggé, jamais propagé**, sinon une panne d'entretien bloquerait les connexions.
- **§9 appliqué** : `auth.service.ts` était à 575 lignes (plafond bloquant 400). Découpé en `session-cookie.ts` (codec) + `invitations.ts` (flux invitation) + `auth.helpers.ts` (hashToken / normalizeEmail / normalizeRole / createConsentRecord) → service à 326 lignes. Collaborateurs construits *dans* le constructeur d'`AuthService`, pas injectés : aucun changement de DI, de module ni de contrôleur, donc déplacement pur couvert par les tests existants.
- **Test de mutation** systématique sur un correctif de ce type : rétablir `first match` dans `candidateValues` fait échouer le nouveau test, et lui seul. Un test de régression non tué par le mutant est décoratif.
- **Verified** : 919 tests API (1284 monorepo), lint 6/6, build 6/6. **Non vérifié** : redémarrage réel d'un conteneur avec un lien demandé avant le déploiement, et parcours navigateur sur staging.

## 2026-09-22 — Moteur de score ATS, noyau (US-097, ADR-021)
- **`packages/ats-score`**, package pur (aucune dépendance runtime hors `@cvforge/types`), sur le gabarit de `document-renderer`. `packages/*` et les tâches turbo étant génériques, **rien à câbler** : ni `pnpm-workspace.yaml`, ni `turbo.json`. La pureté est structurelle, pas conventionnelle — d'où 100 % de lignes couvertes sans effort, ce qui finance les 90 % exigés sur le reste de la feature.
- **L'invariant du barème** : une dimension non observable est **exclue et les poids renormalisés**, jamais notée 0. C'est ce qui permet une seule échelle 0-100 entre la landing (sans offre → `keywords` exclue, renormalisation sur 80) et l'in-app (avec offre). Noter zéro punirait un CV pour une question que le contexte ne pouvait pas poser, et rendrait les deux surfaces incomparables.
- **Bug de conception trouvé par un test, pas par relecture** : le document vide scorait 9/100. Les règles d'*absence de défaut* (« pas de marqueur de tableau », « chronologie correcte ») créditaient un document sans contenu — 15 + 10 points gagnés en n'ayant rien écrit. Règle générale à appliquer partout : **une règle d'absence de défaut ne crédite que s'il existe de la matière où ce défaut pourrait apparaître.** Écrire systématiquement le test du document vide sur tout scoreur.
- **Assertions d'ordre, pas d'égalité** (`score(fort) > score(faible)`, « ajouter un email ne baisse jamais `contactability` ») : elles survivent à un rééquilibrage du barème, là où un snapshot de `68` casse à chaque ajustement et entraîne à taper `-u` sans réfléchir. Le snapshot doré viendra en US-098, avec `engineVersion` dans le fichier pour qu'on ne puisse pas changer le barème sans bumper la version.
- **Le versionnage du barème n'est pas cosmétique** : `ATS_SCORE_ENGINE_VERSION` est persisté avec chaque score, sinon la courbe §12.3 « progression au fil des versions » compare des mesures prises sous deux règles différentes et ment dès le premier rééquilibrage.
- **Findings = codes, jamais des phrases** (`NO_TEXT_LAYER`, `MISSING_QUANTIFICATION`). L'i18n vit dans `content/{fr,en}.ts` et `apps/web` ; la règle « zéro texte en dur » de la landing tient alors sans effort et le package reste pur.
- **Piggyback LLM sur la génération de CV : rejeté.** `normalizeCvJson` puis `groundCvContent()` retirent du contenu *après* l'appel — un jugement rendu dans le même souffle décrirait le brouillon **avant grounding**, un document jamais livré. Vérifier toujours ce qui se passe *après* un appel modèle avant d'y greffer une évaluation. Accessoirement `cv-generation.service.ts` est à **417 lignes** (plafond bloquant 400) : US-105 doit en extraire, pas en ajouter.
- Une dimension pas encore écrite se déclare `unavailable` : la renormalisation produit déjà un score honnête sur le sous-ensemble livré, donc la feature peut atterrir par tranches sans jamais afficher un score faux.
- **Verified** : 36 tests verts, couverture 100 % lignes / 96 % branches, `build` et `lint` du package verts, `turbo test --filter=./packages/*` vert (4/4). **Non vérifié** : aucun vrai CV n'est encore passé dans le moteur (les adaptateurs arrivent en US-098) — le barème n'est étalonné sur aucun ATS réel, c'est une opinion documentée dans l'ADR.

## 2026-09-22 — Adaptateurs et dimensions `keywords` / `impact` (US-098)
- **Un scoreur, deux adaptateurs** : `parseCvText(text, file?)` (landing, texte plat) et `fromCvDocument(content)` (in-app, `CVDocumentContent`) convergent vers le même `AtsDocument`. L'US a été **scindée en 098a/098b** : d'un seul tenant le diff passait les 400 lignes de §4.
- **Le test de parité est un détecteur de bugs, pas une formalité.** Il a trouvé deux faux positifs que ni la relecture ni les tests unitaires n'avaient vus :
  - `TABLE_MARKERS` flaguait `email | téléphone | ville` — un des en-têtes de CV les plus répandus, et parfaitement lisible par un ATS. Un tableau est une structure **répétée ligne après ligne** : la règle exige maintenant ≥2 lignes porteuses de pipes, ou ≥3 pipes sur une seule. Leçon générale : une règle de détection de *mise en forme* doit s'appuyer sur la répétition, jamais sur une occurrence unique.
  - `parseCvText` renvoyait `city: false` en dur → 15 points de `contactability` perdus par tout CV de la landing. La ville est le seul contact **sans forme propre** (ni `@`, ni suite de chiffres, ni domaine) : plutôt qu'une liste de noms de villes, on lit la ligne d'en-tête qui porte déjà l'email ou le téléphone et on y cherche un segment court sans chiffre. Un code postal à 5 chiffres est accepté d'office.
- **Assertion de parité à écrire en deux temps** : l'écart global (±3) *et* l'égalité dimension par dimension. Deux adaptateurs peuvent tomber sur le même total en se trompant en sens inverse sur deux dimensions — seul le second test attrape ça. Résultat obtenu : écart **nul**, dimension par dimension.
- **Baseline de test = document délibérément parfait.** En ajoutant `impact`, `makeDocument()` a cessé d'être parfait (puces non quantifiées, compétences non étayées) et deux tests ont cassé. C'est le fabricant qu'on corrige, pas l'attente : chaque test dégrade ensuite *une* propriété et nomme sans ambiguïté ce qu'il mesure.
- **Erreur de test à ne pas refaire** : j'avais oublié que le **titre de l'offre** alimente `extractKeywords` — 7 termes au lieu des 5 attendus, donc une arithmétique de couverture fausse. Quand un test porte sur un ratio, fixer le dénominateur explicitement (ici un titre sous le plancher de 4 caractères) et couvrir la contribution du titre par un test dédié.
- `keywords` : plafond à **60 % de couverture** (au-delà, c'est un CV écrit pour un parseur). Le bourrage se détecte sur la **répétition** (>6 occurrences d'un terme), pas sur la couverture — deux signaux distincts qu'il ne faut pas confondre.
- `impact` en mode règles est **toujours** calculé : c'est le repli autour duquel le LLM sera clampé à ±25 (US-100). `skillEvidenceRatio` mesure les compétences déclarées que les puces étayent réellement — le CV listant trente technologies dont aucune n'apparaît nulle part.
- **Écart assumé vs le sprint** : pas de fixtures `.txt` séparées. Les deux formes du même CV vivent appariées dans `parity.test.ts` — c'est leur appariement qui fait le test ; des fixtures éparses auraient divergé.
- **Verified** : 80 tests verts, couverture 100 % lignes / 97 % branches, `turbo lint build test --filter=./packages/*` 12/12. **Non vérifié** : aucun PDF réel n'est encore passé dans `parseCvText` (l'extraction arrive en US-099) — l'inférence de sections et de dates n'a vu que du texte écrit à la main.

## 2026-09-22 — Signaux de lisibilité machine à l'extraction PDF (US-099)
- **Le même défaut de conception, pour la troisième fois, trouvé pour la troisième fois par un test** : sans couche texte, `columnSuspicion` et `mojibakeRatio` reviennent à 0 *parce qu'il n'y a rien à mesurer*. Le barème créditait donc 35 points d'artefacts et un CV scanné — illisible par tout ATS — obtenait 50/100. La règle est maintenant systématique : **un sous-critère mesuré sur une donnée absente ne crédite pas, et son finding n'est pas émis** (annoncer des colonnes qu'on n'a pas pu observer enverrait le candidat corriger la mauvaise chose). Quand on ajoute un signal dérivé, toujours se demander ce qu'il vaut quand la source est vide.
- **Regroupement par arrondi sur grille = piège.** `Math.round(y / tolerance)` sépare deux fragments distants de 1 unité s'ils tombent de part et d'autre d'une frontière de grille (y=700 et y=701 → clés 350 et 351). Un en-tête deux colonnes passait donc inaperçu. Remplacé par un **regroupement glouton** (tri par y décroissant, nouvelle ligne quand l'écart dépasse la tolérance) : robuste par construction, pas par chance d'alignement.
- **Séparer le calcul pur de l'I/O paie immédiatement** : `pdf-signals.ts` ne connaît pas pdfjs (il n'emprunte que la *forme* d'un item, `transform[4]`=x et `[5]`=y). Testable contre des objets littéraux au lieu de PDF construits à la main — 13 tests en 5 ms, là où un test passant par pdfjs coûte ~400 ms.
- **`pageCount` renvoie le vrai nombre de pages, pas le nombre plafonné** par `MAX_PDF_PAGES` : « trop de pages » est justement un finding, le plafond ne borne que la lecture.
- **Les signaux sont collectés dans la même passe que le texte.** Rouvrir le document pour le mesurer doublerait le coût de parsing de chaque scan public — sur une route non authentifiée, c'est le genre de doublon qui se paie en CPU.
- `extractCvText(file, { allowOcr })` : le levier `allowOcr` est posé dès maintenant, pour que la route publique (US-102) refuse l'OCR sans retoucher ce fichier. `kind` décrit **d'où vient le texte retourné** ; c'est `signals.hasTextLayer` qui dit que la page était une image — deux informations distinctes qu'il ne faut pas confondre dans un seul champ.
- **Modifier un mock n'est pas modifier un test.** `cv-import.service.test.ts` mockait `extractPdfText` ; le code appelle désormais `extractPdfContent`. Seul le nom du collaborateur mocké change — **aucune assertion de résultat n'a bougé**, ce qui est précisément ce qui prouve que le comportement de l'import est inchangé. Si j'avais dû retoucher une assertion, le refactoring aurait été une régression déguisée.
- **§9 appliqué** : `extractPdfText` s'est retrouvé sans appelant après le refactoring → supprimé, avec ses deux tests déjà couverts par `extractPdfContent`. `cv-import.service.ts` : 284 → 257 lignes.
- **Verified** : 936 tests API / 110 fichiers, 114 tests package (100 % lignes, 97 % branches), lint et build 10/10. Les signaux sont vérifiés **contre de vrais PDF** via le builder du test existant (couche texte, absence de couche texte, pages, prose non prise pour des colonnes). **Non vérifié** : aucun CV réel multi-colonnes exporté par Canva/Word n'a été mesuré — le seuil `COLUMN_GAP_RATIO = 0.15` est une hypothèse à étalonner sur de vrais fichiers.

## 2026-09-22 — Volet LLM borné du score ATS (US-100)
- **Le modèle ne renvoie jamais le score global**, seulement 4 sous-notes 0..10 sur la seule dimension `impact` ; l'arithmétique reste dans `packages/ats-score`. C'est ce qui fait qu'un changement de modèle ne peut pas décaler le score de tous les utilisateurs d'un coup.
- **`clamp(llmImpact, ruleImpact ± 25)`** : le repli par règles est *toujours* calculé, le modèle ne fait que corriger. Testé dans les deux sens (il ne peut ni flatter un CV faible, ni couler un CV fort). Les findings viennent toujours des règles : le modèle ne peut pas en faire disparaître un.
- **`temperature: 0`, pas 0.2** comme le rapport d'entretien. La différence de contexte est décisive : un rapport d'entretien est lu une fois, un score ATS est **persisté et tracé entre versions de CV**. Une même entrée doit donner la même sortie, sinon la courbe de progression mesure du bruit.
- **Borner le schéma, pas seulement les tokens.** Le commentaire de `REPORT_MAX_TOKENS` raconte que 500 tokens avaient cassé la génération de rapports sept fois en un après-midi : réponse coupée en pleine chaîne, `JSON.parse` qui jette. J'ai donc mis un `maxLength` sur chaque chaîne du schéma en plus du plafond de tokens — la cause racine est la longueur du texte libre, pas le budget.
- **Une valeur hors bornes est rejetée, pas clampée.** Hors bornes veut dire que le schéma strict n'a pas été honoré (typiquement un modèle de repli de la chaîne OpenRouter) : toute la réponse est alors suspecte. La ramener dans l'intervalle masquerait le problème et laisserait des sous-notes inventées influencer un score persisté.
- **Ne jamais envoyer une offre vide** : une offre vide invite le modèle à juger la pertinence par rapport à rien et à inventer un poste cible. Le champ est omis, pas vidé.
- Le service **ne jette jamais** : provider en panne, JSON tronqué, champ manquant → `null`, et le moteur rend le score en mode règles avec `llmApplied: false`. Le scoring est gratuit, il ne doit jamais être la raison d'un échec de génération ou de scan.
- **Piège monorepo à retenir** : ajouter `@cvforge/ats-score` aux dépendances ne suffit pas. Vitest résolvait le package (via `exports.types` → `src/index.ts`) et **`tsc` non** — les tests passaient, le build cassait. `apps/api/tsconfig.json` mappe explicitement chaque package workspace dans `paths` : tout nouveau package consommé par l'API doit y être ajouté. Toujours lancer `build` et pas seulement `test` après avoir câblé un package.
- **Verified** : 952 tests API / 111 fichiers, 112 package, module `src/ats` à 100 % lignes et branches, `turbo lint build test` 15/15. **Non vérifié** : aucun appel réel à OpenRouter — le prompt n'a jamais été confronté à un vrai modèle, donc ni la qualité des conseils ni le respect effectif du schéma par `mistral-small-3.2-24b` ne sont établis.

## 2026-09-22 — Rate limiting de la surface IA publique (US-101, ADR-022)
- **Premier rate limiting de l'API.** Il n'y en avait aucun : les seules occurrences de « rate limit » dans le code concernaient les 429 renvoyés *par* OpenRouter. Middleware maison sur le modèle de `SessionStateMiddleware`, **zéro dépendance ajoutée**.
- **Pourquoi pas `@nestjs/throttler`** : il s'installe en **Guard global**, or le dépôt n'utilise délibérément aucun Guard (tout passe par `requireSession`). L'adopter coûtait une dépendance *et* une incohérence structurelle durable pour ~120 lignes.
- **Trois risques distincts, trois réponses.** Ne pas les confondre : l'abus individuel (limite par IP → 429), la facture (budget global → 503), le CPU (OCR désactivé sur la route publique). **Une limite par IP ne fait rien contre un botnet** : le budget global est le vrai stop-loss, et il est vérifié *avant* les règles par IP — un visiteur légitime reçoit quand même 503 quand le budget du jour est épuisé, ce qui est assumé.
- **429 et 503 doivent rester sémantiquement distincts** : « vous en avez trop demandé » vs « le service est indisponible ». Le second n'accuse pas un visiteur qui n'a rien fait de mal.
- **Une requête rejetée ne doit pas être comptée.** Sinon le client qui martèle la route repousse sa propre fenêtre à chaque tentative et n'en sort jamais — un bannissement de fait, non voulu et très difficile à diagnostiquer côté support. Les hits ne sont enregistrés qu'une fois *toutes* les règles passées.
- **Piège Nest, deuxième fois** : le constructeur d'un middleware voit chacun de ses paramètres résolu par l'injecteur. Un `private readonly now: () => number = Date.now` — pourtant muni d'un défaut — ne donne **aucun token à chercher** et le conteneur refuse de démarrer. Passer par un token (`RATE_LIMIT_CLOCK`). C'est exactement ce que le commentaire de `SessionStateMiddleware` avertit, et l'avoir lu m'a évité le bug. Bénéfice : les tests avancent le temps au lieu de l'attendre, sans `sleep` ni faux timers.
- **Une valeur d'env malformée retombe sur le défaut, jamais sur « pas de limite ».** Un `ATS_PUBLIC_HOURLY_LIMIT=abc` ou `=0` qui désactiverait la limite ouvrirait silencieusement une route IA publique sur une faute de frappe.
- **`trust proxy` est indispensable et vaut 1** : sans lui Express rapporte l'adresse du reverse proxy pour chaque visiteur et la limite par IP les regroupe tous dans un seul seau. Si l'infra ajoute un hop, le premier saut de `X-Forwarded-For` cesse d'être le client — à revoir avec toute évolution du proxy.
- Le middleware est **scopé à `public/ats-scan`**, pas global : les autres routes publiques (`public/legal`, `public/credit-offers`) sont des lectures bon marché. Syntaxe Express 5 / path-to-regexp v8 : `forRoutes("public/ats-scan", "public/ats-scan/{*splat}")`, un `*` nu jette au bootstrap.
- **Redis : délibérément pas maintenant.** Provisionné dans `docker-compose.yml` mais `REDIS_URL` lu nulle part ; l'API est mono-instance. `RateLimitStore` est une interface pour que `RedisRateLimitStore` soit un remplacement d'une ligne au scale-out. Limite assumée : un redémarrage remet le budget du jour à zéro.
- Ajouter un module à `AppModule` casse `app.module.test.ts`, qui compare la liste **exacte** des imports. Attendu, pas une régression.
- **Verified** : 977 tests API / 114 fichiers, module rate-limit à 100 % lignes et fonctions (92 % branches), `turbo lint build test` 15/15, graphe de dépendances résolu par `app.module.boot.test.ts`. **Non vérifié** : aucun test d'intégration HTTP réel (pas de requête traversant Express jusqu'au middleware), et le comportement derrière le vrai reverse proxy Dokploy n'est pas confirmé — c'est le gate de sprint à lever avant mise en ligne.

## 2026-09-22 — Endpoint public de scan ATS (US-102)
- **Le même défaut de conception pour la quatrième fois, révélé par un test produit** : un PDF scanné recevait `MISSING_EXPERIENCE_SECTION`, `MISSING_EMAIL`… alors que son CV a probablement les deux — **on n'a simplement pas pu les lire**. Sans couche texte, seule `machineReadability` est désormais jugée ; les cinq autres dimensions passent `unavailable` avec la raison `NO_TEXT_LAYER`. La règle est maintenant un réflexe : **quand une entrée est absente, ce n'est pas une valeur nulle, c'est une mesure impossible** — et un diagnostic tiré d'une mesure impossible envoie l'utilisateur corriger ce qui n'est pas cassé.
- **Le gating se fait dans la charge utile, jamais dans l'affichage.** `PublicAtsScanResponse` n'a pas de champ `dimensions` : il n'existe aucun chemin de code qui le mette sur le fil. Un flou CSS ou un champ retiré à la sérialisation se contourne avec l'onglet réseau ; un type qui ne le contient pas, non. Test : `JSON.stringify(response)` ne doit pas contenir `machineReadability`.
- **Sur une route publique, le `mimetype` déclaré ne vaut rien** : il est trivialement mis à `application/pdf` sur n'importe quoi. Ce sont les **magic bytes** (`%PDF-`, `PK\x03\x04`) qui décident. Même logique pour la taille : mesurer `buffer.length`, pas le `size` annoncé par le client.
- **Le budget est vérifié AVANT le parsing et l'appel modèle.** Un stop-loss qui s'exécute après la dépense ne sert à rien. Testé explicitement : budget épuisé ⇒ `impact.assess` n'est jamais appelé.
- **Ne pas payer un LLM pour préparer une comparaison de sacs de mots.** Structurer une offre collée est un travail de modèle dans ce repo ; sur une route publique gratuite, le texte entier part comme une seule exigence, puisque `keywords` n'en extrait de toute façon que des termes. **Mais il a fallu ajouter un filtre de mots vides** : sans lui, « nous recherchons un profil motivé pour rejoindre notre équipe » noie les trois termes qui comptent et la couverture s'effondre pour des raisons sans rapport avec le candidat.
- **Piège monorepo, variante du précédent** : le package est résolu par **`tsc` via `paths` (sources)** mais par **vitest via `exports` (dist)**. J'ai corrigé le moteur, les 116 tests du package sont passés au vert, et le test côté API échouait toujours — il lisait un `dist` périmé. **Reconstruire le package avant de lancer les tests de l'app.** (Déjà noté pour `@cvforge/types`, même piège, deuxième fois.)
- **Tester le format que personne ne teste** : le chemin DOCX n'était traversé par aucun test alors qu'il est accepté en production. La lib `docx` étant déjà une dépendance de l'API (export), un vrai `.docx` se génère avec `Packer.toBuffer` — bien mieux qu'un mock, et ça couvre la branche « pas de signaux de mise en page ».
- **Rejeu d'un déverrouillage** : `where(... isNull(unlockedAt))` fait du second appel un no-op. Sans cette clause, rejouer la requête redirigerait le rapport vers une autre adresse.
- Schéma : **aucune colonne ne peut accueillir du texte de CV**. Ce n'est pas une discipline d'écriture, c'est une propriété de la table — le test RGPD (`JSON.stringify(row)` ne contient pas la phrase de la fixture) vérifie les deux chemins, PDF et DOCX.
- **Verified** : 93 tests module (100 % sur chaque fichier de production), 1052 tests API / 120 fichiers, 116 package, `turbo lint build test` 15/15, migration `0019` et ses CHECK rejouées sous PGlite. **Non vérifié** : aucune requête HTTP réelle ne traverse Express jusqu'au contrôleur (multipart, `FileInterceptor`, middleware de rate limit en conditions réelles) ; et aucun CV réel exporté par Canva/Word n'est passé dans la chaîne complète.
- **Écart assumé** : pas de timeout applicatif de 20 s sur le handler. L'OCR étant coupé, le coût restant est pdfjs et l'appel modèle (déjà borné par `max_tokens` et les retries). Un timeout global se pose au reverse proxy, pas dans le handler — à trancher au déploiement.

## 2026-09-22 — Déverrouillage du rapport ATS et purge de rétention (US-103)
- **Avaler l'échec d'envoi du magic link est une décision de sécurité, pas seulement de robustesse.** `requestMagicLink` lève **403 pour un compte suspendu** et **400 pour un inconnu sans consentement** : propager ces erreurs dirait à un appelant anonyme si une adresse possède un compte chez nous. Sur une route publique, toute différence de réponse observable est un oracle d'énumération — y compris une erreur « légitime » remontée telle quelle depuis une couche interne. Réponse identique dans tous les cas, échec loggé.
- **Livrer la valeur dans la réponse, l'acquisition par email.** Le rapport complet part dans le corps de la réponse ; le magic link est envoyé en parallèle et fait la conversion en compte. Envoyer le visiteur dans sa boîte mail pour voir ce qu'il vient de demander perd l'essentiel du tunnel — et le lien, lui, le ramène *connecté*.
- **Pas de table `leads`.** Le magic link crée déjà le compte à sa consommation ; le lien lead↔compte est une jointure de lecture sur l'adresse. Aucun hook, aucun couplage ajouté dans l'auth, aucun pipeline email parallèle à maintenir.
- **Le consentement se teste `=== true`, jamais en truthy** : `"yes"`, `1` ou `{}` ne valent pas un consentement explicite alors qu'ils passeraient un `if (body.consentAccepted)`. Envoyer le lien vaut création de compte, donc c'est la même exigence qu'au login.
- **Idempotence du rejeu** : c'est le store qui la garantit (`where ... isNull(unlockedAt)`), pas le service. Un rejeu renvoie le rapport sans erreur **et sans déplacer l'adresse** à laquelle le rapport a été libéré — sans cette clause, rejouer la requête redirigerait un rapport vers l'adresse d'un tiers.
- **410 et non 404 pour un scan expiré** : la ressource a existé et n'existe plus, ce qui est une information utile au client (relancer une analyse) et distincte d'un identifiant inventé.
- `AtsPurgeService` calqué sur `InterviewPurgeService` : `setInterval` sur le cycle de vie du module, convention du repo (aucune lib de cron). **L'échec est loggé, jamais propagé** — rien n'attend la purge, une rejection non gérée ferait tomber l'API. Testé avec `vi.useFakeTimers()` : purge immédiate au démarrage, puis à 24 h, et plus rien après `onModuleDestroy`.
- La règle de rétention est **déclarée** dans `PRIVACY_RETENTION_POLICY` en plus d'être implémentée : c'est ce que l'utilisateur lit sur la page vie privée, et la laisser désynchronisée du code en ferait une promesse fausse. Elle dit explicitement que le CV n'est jamais stocké.
- **Verified** : 121 tests module ATS (100 % lignes et fonctions), 1080 tests API / 122 fichiers, 116 package, `turbo lint build test` 15/15. **Non vérifié** : aucun envoi SMTP réel, et le parcours complet (scan → email → clic sur le lien → arrivée connecté dans `apps/web`) n'a jamais été joué de bout en bout dans un navigateur.

## 2026-09-22 — Page publique d'analyse ATS sur la landing (US-104)
- **Ajouter une page à slug localisé, ce n'est pas seulement du routage** : `localizedPath` (lib/i18n) doit connaître le nouveau slug, sinon le sélecteur de langue conserve celui de la langue courante et envoie sur un **404**. Aucun test de page n'attrape ça — il faut un test dédié qui traduit le chemin dans les deux sens. La fonction fait maintenant une boucle sur la liste des jeux de slugs (`storySlugs`, `atsSlugs`) au lieu d'un cas en dur.
- **Trois endroits à toucher, pas un** : `next.config` (redirect + rewrite, gabarit `story`), `lib/<page>.ts` (le chemin canonique), `lib/i18n` (la traduction du chemin). Plus `sitemap.ts` et la nav. Le test de config vérifie qu'aucun redirect ne pointe vers la source d'un autre — c'est ce qui attrape une boucle.
- **`SectionHeading` rend un `<h2>`.** Sur une page autonome, écrire son propre `<h1>` (ce que fait déjà `story-page`) : réutiliser le composant de section donnerait une page sans titre de niveau 1.
- **Le typage `Record<string, string>` ne protège pas d'une clé manquante.** Le dictionnaire doit nommer les 23 codes de finding ; un code oublié s'afficherait au visiteur comme un identifiant brut (`MISSING_QUANTIFICATION`). D'où un test qui énumère les codes explicitement, en plus du test de parité FR/EN.
- **Le BFF de la landing existe pour une raison précise** : le CORS de l'API est crédentialé et volontairement mono-origine (l'app). L'élargir pour qu'une page publique poste directement serait une régression de sécurité. Deux détails qui comptent dans ce relais : refuser un upload trop gros sur `content-length` **avant** de le transporter, et **transférer `x-forwarded-for`** — sans quoi tous les visiteurs arrivent à l'API comme ce serveur et partagent un seul seau de rate limit.
- **Relayer les statuts tels quels.** 429, 503 et 410 portent des messages différents sur la page ; les écraser en 500 les rendrait indistinguables. Et lire le corps d'erreur avec un `try/catch` : un 502 du proxy est du HTML, `response.json()` y jette.
- **A11y de la jauge** : la couleur ne porte jamais seule le verdict — le libellé de bande est écrit à côté du chiffre, et un `sr-only` donne la phrase complète (« Score ATS : 72 sur 100 — Solide »). Le focus est déplacé vers le panneau de résultat après l'analyse, sinon la page change silencieusement sous le lecteur.
- `pnpm typecheck` de la landing = `next typegen && tsc`. Sans le typegen, une nouvelle route fait échouer `PageProps<"/[locale]/…">` avec un `AppRoutes` périmé — ce n'est pas une erreur de code.
- **Verified** : landing 39 → **90 tests**, `build` vert (page prérendue FR et EN, deux routes BFF dynamiques), lint et typecheck propres ; 1080 tests API, 116 package, turbo 12/12. **Non vérifié** : la page n'a jamais été ouverte dans un navigateur — ni axe-core outillé, ni upload réel, ni parcours complet jusqu'au magic link. C'est le gate a11y du sprint, encore ouvert.

## 2026-09-22 — Parcours ATS joué dans un vrai navigateur : trois bugs qu'aucun test n'avait vus
- **`POST /api/ats-scan` → 404.** Le `proxy.ts` de la landing préfixe toute URL sans locale ; son matcher excluait `_next` et `login` mais **pas `api`**. La requête partait en `/en/api/ats-scan`, inexistante — **toute la page était inopérante**, avec 90 tests au vert. Les tests appellent `POST()` directement et ne traversent jamais le middleware. **Leçon : une route handler ajoutée à une app localisée doit être exclue du matcher, et le matcher lui-même mérite un test.**
  - Piège dans le test de ce matcher : `new RegExp(config.matcher[0])` n'est **pas ancré**, alors que Next l'ancre. Non ancrée, la regex matche `/api/ats-scan` à partir du 4ᵉ caractère et le test passe alors qu'il ne devrait pas. Toujours écrire `^…$`.
- **Le déverrouillage partageait le quota de scan.** Un visiteur qui analysait 3 CV (son quota horaire) ne pouvait plus ouvrir aucun rapport pendant une heure : le garde-fou anti-coût bloquait la conversion elle-même. Or un unlock ne coûte ni parsing ni appel modèle. Corrigé : **clés de compteur séparées** (`scan:` / `unlock:`), limites propres (10/h, 30/j), et **le budget global ne s'applique qu'au scan** — sinon un budget épuisé laisse un visiteur avec un scan qu'il ne peut pas ouvrir. Règle générale : **ne jamais mesurer deux actions de coûts différents avec le même compteur.**
- **« 0 autres points détectés »** : l'accroche du déverrouillage se dégonflait précisément sur les bons CV. Un décompte affiché doit toujours avoir une formulation de repli à zéro. Et une fois le rapport ouvert, les findings du teaser étaient répétés dans le détail — teaser masqué après déverrouillage.
- **Artefact d'outillage à connaître** : `form_input` (Chrome MCP) écrit la valeur DOM sans déclencher les événements React, donc l'état reste vide et le bouton `disabled` — ça ressemble à un bug produit et n'en est pas un. Piloter React depuis le DOM demande le setter natif du prototype + `dispatchEvent(new Event('input', {bubbles:true}))`.
- **Validé en conditions réelles** : `llmApplied: true` (mistral-small honore bien le `json_schema` strict) ; **zéro texte de CV en base** (recherche SQL sur le contenu du CV : 0 ligne), `ip_hash` sur 64 hex ; rate limit 3 puis 429 avec `Retry-After: 3600` ; PDF scanné → score 15, `partial: true`, **un seul finding** `NO_TEXT_LAYER` et aucun faux diagnostic ; déverrouillage → rapport complet affiché, lead + magic link en base, **aucun compte créé avant consommation du lien** (conforme à l'intention).
- **Non vérifié** : l'arrivée physique de l'email chez Resend (l'API tournait hors de mon log) ; axe-core n'a pas été exécuté ; aucun test au clavier seul ; `ENABLE_ZDR_CHAT=false` en dev — **à passer à `true` en production**, la vision l'exige (§15.3).

## 2026-09-22 — Rééquilibrage du barème ATS (1.0.0 → 1.1.0)
- **Le vrai défaut n'était pas des barèmes trop cléments, c'était la moyenne pondérée elle-même.** Un CV squelettique de 35 mots obtenait **61/100 « Perfectible »** : la longueur ne pèse que sur une dimension valant 10, donc un défaut rédhibitoire coûtait ~4 points au global et était noyé par tout ce que le candidat avait réussi ailleurs. Toute la plage utile était écrasée entre 61 et 94.
- **Correctif : un finding `critical` plafonne le score global** (`CRITICAL_CAPS`), le plus bas l'emportant. La moyenne continue de classer les CV entre eux ; le plafond empêche seulement qu'un défaut fatal soit moyenné. C'est le raisonnement d'un recruteur : il s'arrête à l'email manquant, quelle que soit la mise en page. **Règle réutilisable : dès qu'un score agrège des critères hétérogènes, prévoir un mécanisme de disqualification — une moyenne ne sait pas dire « celui-ci est éliminatoire ».**
- **Le plafond dépend de la sévérité, pas seulement du code.** Le même `TOO_SHORT` est `critical` sous 250 mots (plafond 45) et `warning` entre 250 et 400 (aucun plafond). D'où un seuil « squelettique » distinct du seuil « court ». Un code de finding peut donc porter deux verdicts : **le libellé doit rester vrai aux deux sévérités** (« trop court pour convaincre » était faux sur un CV à 95/100).
- **Exposer `cappedBy`** : un score plafonné sans explication se lit comme une jauge cassée.
- **Les 116 tests existants sont passés sans UNE modification.** C'est le dividende des assertions d'ordre (`score(fort) > score(faible)`) choisies en US-097 : un barème se rééquilibre sans réécrire sa suite de tests. Des snapshots de valeurs auraient tous cassé et poussé à taper `-u` sans réfléchir.
- **Calibrer sur un fixture, pas sur une intuition** — et vérifier que le fixture est réaliste : mon CV de test faisait 120 mots, moins qu'un CV épuré d'une page, ce qui faussait ma lecture de « 94 est trop généreux ». Étalonnage final obtenu : squelettique **45**, moyen aux tâches non chiffrées **63**, soigné mais mince **95**, impeccable **100**.
- **Rééquilibrer avant que quoi que ce soit ne soit persisté.** Le bump 1.1.0 rend les scores 1.0.0 non comparables ; c'est exactement ce que le versionnage du barème existait pour permettre, mais une fois des scores in-app en base, l'opération aurait demandé une migration ou une double échelle.
- **Verified** : 127 tests package (100 % lignes, 97 % branches), 1086 API, 94 landing, `turbo lint build test` 18/18 ; étalonnage revérifié en réel via l'API sur trois CV de qualités différentes. **Non vérifié** : aucun CV réel d'utilisateur n'a servi à l'étalonnage — les seuils (250/400/900 mots, plafonds) restent une opinion documentée, à réviser sur retours terrain en bumpant à nouveau la version.

## 2026-09-22 — Score ATS in-app + audit axe (US-105)
- **axe-core 4.10.2 : zéro violation** sur la page ATS — page entière en thème **clair et sombre**, aux trois états (initial, résultat, déverrouillé), et les **4 bandes de score × 2 thèmes** (les couleurs de bande ne sont visibles qu'avec le bon score, il faut donc les forcer pour les auditer).
  - **Piège de mesure** : lancer axe juste après avoir changé de thème renvoie des dizaines de faux positifs `color-contrast` — il mesure pendant la transition CSS. Attendre ~1,5 s ; un second passage suffit à le confirmer.
  - **Ne pas recalculer les contrastes à la main** : `getComputedStyle` renvoie `lab()`/`oklch()` en Chrome moderne, pas `rgb()`. Mon parseur lisait des composantes lab comme du RGB et sortait des ratios absurdes (1.5 pour du texte parfaitement lisible). axe fait ce calcul correctement, lui faire confiance.
- **Score in-app : 0 crédit, 0 appel modèle.** Le document est déjà structuré, donc les règles déterministes suffisent — c'est précisément ce qui permet de recalculer à **chaque sauvegarde** et pas seulement à la génération.
- **Deux emplacements, deux formes** : le résultat complet en jsonb sur `applications` (lu par ligne de liste, jamais interrogé champ par champ) ; seulement le **nombre** par version, pour que la courbe de progression lise une colonne au lieu de re-scorer l'historique. **`ats_engine_version` voyage avec le nombre** — deux échelles ne partagent jamais une moyenne.
- **Absent ≠ zéro** : colonnes nullables, et un scoring raté laisse la version *non estampillée*. Enregistrer 0 se lirait comme un mauvais CV alors que c'est une mesure qui n'a pas eu lieu.
- **Recalibrer sur une mesure, jamais sur une intuition.** Un CV avec 2 expériences et 8 puces détaillées mesure **202 mots** — j'avais posé le plancher « squelettique » à 250, ce qui condamnait des CV corrects à 45/100. Corrigé à 150 (et « court » de 400 → 250). Découvert parce qu'un test comparant deux CV voyait 45 des deux côtés : **le plafond écrase les différences en dessous de lui et rend un test aveugle** — quand deux cas censés différer donnent la même valeur, suspecter un plafond avant de suspecter le test.
- **Bug attrapé par le test de round-trip DB** : j'avais câblé la **lecture** de `applications.ats_score` mais pas l'**écriture** (`toRow`). Tous les tests unitaires du scoring passaient. Quand on ajoute une colonne, tester le round-trip complet, pas seulement le calcul.
- **§9 appliqué dans le bon sens** : le service devait *perdre* des lignes en gagnant une responsabilité. `cv-generation.reads.ts` (4 accesseurs + le chargeur commun, aucune orchestration) → **433 → 396 lignes**.
- **Verified** : 1099 tests API / 123 fichiers, 127 package, 94 landing, `turbo lint build test` **18/18** ; migration `0020` appliquée sur la vraie base, les 3 colonnes vérifiées. **Non vérifié** : aucun CV n'a été régénéré via l'UI connectée, donc le badge n'a jamais été vu à l'écran (c'est US-106) ; les 3 CV existants en base restent sans score, ce qui est le comportement voulu.

## 2026-09-22 — Badge de score ATS dans apps/web (US-106)
- **Un cycle de dépendances évité** : `@cvforge/ats-score` dépend déjà de `@cvforge/types`, donc `DraftApplication` ne peut pas importer `AtsScoreResult` en retour. J'ai défini un **`AtsScoreSummary`** minimal (score, band, engineVersion) dans `@cvforge/types` : le type de transport déclare ce sur quoi un client peut compter, le résultat complet reste dans le moteur. Structurellement compatible, donc `StoredApplication` continue de porter le résultat entier.
- **Le badge de l'éditeur dit quand il est périmé.** Le score persisté décrit la *dernière version enregistrée*, pas ce qui est à l'écran : tant que l'éditeur est `dirty`, le badge est atténué et son `aria-label` précise « dernière version enregistrée ». **Un nombre périmé qui se fait passer pour actuel est pire que pas de nombre** — à se demander chaque fois qu'on affiche une valeur dérivée à côté d'un formulaire modifiable.
- **Absent ⇒ rien afficher.** Le composant retourne `null` (pas un tiret, pas un zéro) quand il n'y a pas de score : un « 0 » dirait au candidat que son CV est mauvais alors qu'il n'a jamais été mesuré. Testé avec `null`, `undefined` et `NaN` — et un vrai 0 mesuré, lui, s'affiche.
- **Piège du `dist` périmé, troisième occurrence** : ajouter `AtsScoreSummary` aux sources de `@cvforge/types` ne suffit pas, `apps/web` lit le `dist`. Le typecheck échouait sur 7 fichiers pour une seule cause. **Réflexe à acquérir : après avoir touché un type partagé, `pnpm build` le package avant de typechecker l'app.**
- **Vérification réelle sans toucher aux données du propriétaire** : plutôt que de re-sauvegarder un CV du compte connecté, j'ai forgé une session pour le compte démo (technique du script `capture-screenshots.mjs` : cookie HMAC signé avec `AUTH_SESSION_SECRET`) et rendu la page via `curl`. Cela prouve le HTML réellement servi (`aria-label`, contenu visible) sans écrire dans l'historique de quelqu'un.
- **Confirmé en bout de chaîne** : une sauvegarde de CV (PUT) produit **65 « fair »**, `llmApplied: false`, et **aucune écriture au ledger de crédits** — le « gratuit » d'US-105 est vérifié, pas supposé. Les versions antérieures restent sans score.
- **Verified** : 16 tests badge, 318 web, 1099 API, 127 package, 94 landing, `turbo lint build test` **21/21**. **Non vérifié** : le badge n'a pas été soumis à axe (les tests a11y du web n'existent pas encore — dette du sprint 023 toujours ouverte) ; l'état `stale` n'a pas été observé dans un navigateur, seulement testé unitairement.

## 2026-09-22 — KPI admin du score ATS (US-107) — épic E18 close
- **Les moyennes sont groupées par `ats_engine_version`, jamais mises en commun.** Le barème a été rééquilibré en 1.1.0 au milieu du sprint : une moyenne mêlant 1.0.0 et 1.1.0 mesurerait le rééquilibrage, pas les CV. C'est exactement ce que le versionnage du barème existait pour permettre — et la première fois qu'il sert vraiment. **Toute métrique agrégée sur une échelle versionnée doit grouper par version.**
- **Un taux vaut `null`, pas 0, quand il n'y a rien à diviser.** « Aucun scan pour l'instant » et « personne n'a converti » sont deux faits différents ; un 0 % sur un entonnoir vide se lit comme un échec du produit. La carte n'affiche alors aucun pourcentage et la moyenne affiche « — ». Même famille que la règle `absent ≠ zéro` du badge.
- **Une version non scorée est exclue de la moyenne** (`is not null` dans le `where`), jamais comptée zéro : les CV générés avant la fonctionnalité feraient sinon chuter la moyenne sans rien mesurer.
- **`count(distinct email)` pour la conversion** : un visiteur qui scanne deux fois puis crée un compte est **une** conversion, pas deux. Le lien lead↔compte reste une jointure de lecture sur l'adresse — aucun couplage ajouté dans l'auth.
- `metrics.pg-store.ts` est le seul store du repo qui agrège en SQL (les autres lisent des lignes et réduisent en JS) ; les nouveaux compteurs suivent cette exception assumée, documentée en tête de fichier.
- **Vérifié sur la vraie base** : 7 scans publics, 3 déverrouillés (43 %), 0 lead converti (les magic links n'ont jamais été consommés — cohérent), moyenne **65 sur le barème 1.1.0** pour 1 CV ; page admin rendue avec « Barème 1.1.0 (1 CV) ».
- **Verified** : 6 tests SQL sous PGlite, 4 tests de rendu, `turbo lint build test` **21/21** (1105 API · 322 web · 127 moteur · 94 landing). **Non vérifié** : la page admin n'a pas été soumise à axe, et aucun jeu de données à volume réaliste n'a été mesuré (les agrégats n'ont jamais vu plus de quelques lignes).

## 2026-09-22 — Livraison de l'épic ATS : commits, push, infra
- **Un nouveau package workspace demande QUATRE lignes dans `docker/api.Dockerfile`** (copie du package.json, copie des sources, `RUN pnpm --filter <pkg> build`, copie du `dist` dans l'étage runner) en plus de la dépendance dans `package.json`. Le Dockerfile énumère les packages un par un, il n'y a aucun glob. **Le monorepo était vert en local (21/21) et le build CI de l'image API a quand même échoué** — `turbo` et Docker ne voient pas le même monde. Réflexe : après avoir créé un package, construire l'image concernée en local (`docker build -f docker/api.Dockerfile .`) **et la démarrer**, avant de pousser.
  - Le boot exige de vraies variables : sans `OPENROUTER_API_KEY` le conteneur meurt au démarrage (`ExceptionHandler`), ce qui ressemble à un bug d'image et n'en est pas un.
- **Configuration de déploiement : le code d'abord, GitHub Secrets seulement pour les secrets.** `infra/dokploy/variables.tf` porte tout ce qui n'est pas secret (defaults versionnés, relus en revue) ; seul un vrai secret passe par un *GitHub Environment* + `TF_VAR_*` dans `deploy.yml`. Le commentaire du workflow le dit explicitement : « Every non-secret setting is a default in variables.tf ».
- **Un secret optionnel vaut mieux qu'un secret obligatoire** quand l'application sait s'en passer : `ats_ip_hash_secret` a un default vide, et l'API tire alors un sel par process. Un secret absent ne doit pas faire échouer un déploiement (même motif que `openrouter_management_api_key`). Sels **distincts par environnement** : staging et production ne doivent pas produire les mêmes hachages.
- **`ENABLE_ZDR_CHAT` n'est pas un simple flag.** `data_collection: "deny"` est un **filtre de routage** : OpenRouter ne considère plus que les fournisseurs annonçant le zero data retention, donc l'activer peut rendre le modèle configuré indisponible et faire échouer toute génération. La vision l'exige en production, mais la bascule doit être **observée sur staging** avant d'atteindre la prod — ce que le pipeline (develop→staging, main→production) permet par construction.
- `push` sur `develop` **déclenche le déploiement staging** : tout commit poussé part immédiatement. Vérifier le run après chaque push plutôt que de considérer le travail terminé au `git push`.

## 2026-09-22 — Staging : ZDR vérifié en conditions réelles
- **`ENABLE_ZDR_CHAT=true` n'a pas cassé la génération.** Le scan public sur staging renvoie `llmApplied: true` avec `data_collection: "deny"` actif : au moins un fournisseur de `mistral-small-3.2-24b-instruct` annonce le zero data retention. Le risque identifié (filtre de routage rendant le modèle introuvable) ne s'est pas matérialisé, mais il reste réel à chaque changement de modèle ou de fournisseur.
- **Un scan réussi ne prouve PAS que le LLM a répondu** : par conception, un échec retombe silencieusement sur les règles avec `llmApplied: false`. La réponse publique masquant ce champ (gating serveur), il faut **déverrouiller un rapport** pour l'observer. Vérifier un repli silencieux demande de regarder le champ qui le signale, jamais le code de statut.
- Rappel de cohérence : le même CV score **95 en local avant le recalibrage des seuils, 99 après** (MIN_WORDS 400 → 250, donc plus de `TOO_SHORT`). Deux environnements sur deux versions de barème ne sont pas comparables — c'est précisément ce que `engineVersion` sert à détecter.

## 2026-09-22 — E19 « Offres du jour », US-108 : le module « Projet de recherche »
- **`PgProfilesStore.save` supprime et réinsère TOUTES les lignes de profil d'un utilisateur.** Une table qui référencerait `profiles.id` avec `on delete cascade` perdrait donc ses données à chaque sauvegarde de profil. `search_projects` est volontairement reliée par `(user_email, profile_id)` **sans clé étrangère**, et un test rejoue une réécriture de registre pour le prouver. À vérifier pour toute table future rattachée à un profil.
- **Le test de purge RGPD (`privacy.service.test.ts`) balaie toutes les colonnes texte de toutes les tables** à la recherche de l'adresse. Une nouvelle table contenant `user_email` fait échouer ce test tant qu'elle n'est pas branchée dans `PrivacyService.purgeAccount`. C'est un garde-fou, pas un obstacle : il a fonctionné.
- **`drizzle-kit generate` est inutilisable ici** : les snapshots `drizzle/meta` s'arrêtent à `0011` alors que les migrations vont à `0020`, donc la génération produit un fichier qui recrée des tables existantes. Convention réelle du dépôt : **écrire le SQL à la main** et ajouter l'entrée dans `_journal.json` avec un `when` croissant.
- **`@cvforge/types` se résout par `dist/`** : un type ajouté dans `src/` existe pour `tsc` (via `"types": "./src/index.ts"`) mais **vaut `undefined` à l'exécution** tant que `pnpm --filter @cvforge/types build` n'a pas tourné. Symptôme trompeur : « Cannot read properties of undefined » sur une constante qui existe pourtant.
- **Un mot courant ne peut pas servir de mot-clé.** Lire le contrat « VIE » dans l'ancien texte libre attrapait « équilibre de vie ». Les motifs sont comparés entourés d'espaces, et « VIE » n'est reconnu qu'en majuscules ou via « volontariat international ».
- La normalisation du projet de recherche **écarte silencieusement** toute valeur d'énumération inconnue plutôt que de rejeter la requête : un payload invalide se lit comme « non renseigné », jamais comme une erreur qui bloquerait le formulaire.
- **Verified** : `turbo lint build test` vert sur tout le dépôt (1151 tests API, 322 web). **Non vérifié** : aucun parcours manuel dans le navigateur, et l'autocomplétion de communes (geo.api.gouv.fr) n'a jamais été appelée en vrai.

## 2026-09-22 — E19, US-109 : la source France Travail
- **Une alternance n'est pas un `typeContrat` chez France Travail, c'est un `natureContrat`** (E2 apprentissage, FS professionnalisation). Une recherche d'alternance qui ne pose que `typeContrat` ne renvoie rien, et une offre d'alternance est par ailleurs typée CDD ou CDI — la lire comme un CDD l'enverrait à des candidats qui n'en veulent pas. Le mapper lit donc la nature **avant** le type.
- **Un code de contrat inconnu vaut `unknown`, jamais CDI par défaut.** L'erreur qui coûte cher ici est de proposer un CDI à quelqu'un qui ne cherche qu'un stage.
- **`isStillOpen` doit distinguer « fermée » de « on ne sait pas ».** Un 429 ou une coupure réseau renvoient `null` : lire un incident comme « offre disparue » retirerait une offre vivante de la sélection du candidat.
- **Une page en échec n'est pas un plafond atteint.** Premier jet : le `break` de la boucle de pagination tombait sur le `logger.warn` du plafond de 1 150 résultats, donc une erreur 400 se journalisait comme « requête trop large ». Repéré uniquement parce que les warnings de test ont été relus — un test vert ne dit rien des logs qu'il produit.
- **Un `Response` ne se lit qu'une fois** : `mockResolvedValue(response)` (sans `Once`) rend le même objet à chaque appel, et le deuxième `json()` lève « Body is unusable ». Le code avalant l'erreur, le test restait vert tout en ne testant plus rien. Utiliser `mockImplementation(async () => makeResponse())`.
- **`Number("-5")` est fini** : un `Retry-After` négatif passait le test `Number.isFinite`, tombait dans `Date.parse("-5")` (qui réussit !) et donnait un délai de 0, donc un réessai immédiat. Un en-tête négatif est cassé, pas « réessayer dans le passé ».
- Le limiteur prend une horloge et un `sleep` injectables : les tests avancent le temps eux-mêmes et **affirment** le rythme (3 immédiates puis une toutes les ~333 ms) au lieu de l'attendre.
- **Verified** : 51 tests sur `src/job-search`, lint et typecheck verts. **Non vérifié** : aucun appel réel — les codes de référence et le quota de notre application restent à confirmer via `pnpm --filter @cvforge/api ft:smoke`.

## 2026-09-23 — E19, US-110 : pages carrières des entreprises et registre
- **Les formats d'API se vérifient, ils ne se devinent pas.** Les endpoints des logiciels de recrutement sont publics : quatre `curl` ont donné les vrais champs (Greenhouse, Lever, Ashby, SmartRecruiters) et invalidé mes suppositions sur quatre autres (Workable renvoie `jobs: []` sur tous les comptes sondés, Recruitee 404 partout). Les adaptateurs écrits reposent sur des charges utiles réelles ; les quatre autres sont **reportés plutôt que devinés**.
- **Greenhouse sert son HTML doublement échappé** (`&lt;p&gt;` après parsing JSON). Retirer les balises avant de décoder les entités laisse toute l'annonce en markup visible. Ordre correct : décoder, retirer, redécoder.
- **`first_published` et pas `updated_at`** (Greenhouse), `dateCreation` et pas `dateActualisation` (France Travail) : partout, la date d'édition ferait passer une vieille offre pour neuve.
- **Le libellé de contrat ment, l'identifiant non.** SmartRecruiters envoie `typeOfEmployment.label = "Full-time"`, qui est un temps de travail, pas un contrat — un CDD peut être à temps plein. C'est `id = "permanent"` qui porte l'information.
- **Le sens de dépendance se décide une fois.** La collecte devra créer des candidatures (`job-search → applications`), donc l'enregistrement d'une entreprise depuis une offre importée ne pouvait pas être `applications → job-search` sans cycle. `ApplicationsService.onOfferImported`, sur le modèle exact de `AuthService.onAccountCreated`, garde une seule direction.
- **Ce dépôt n'utilise pas les métadonnées de décorateurs pour l'injection.** Un constructeur de module Nest avec de simples types reçoit `undefined` ; il faut `@Inject(Service)` explicite. Le symptôme (`Cannot read properties of undefined`) n'apparaît qu'au démarrage, attrapé par `app.module.boot.test.ts`.
- **Un fournisseur sans adaptateur ne doit pas compter d'échec** : sinon il serait désactivé après cinq passages pour une raison qui est la nôtre, pas la sienne. Il est enregistré et laissé tranquille.
- **Une collecte réussie ne réactive pas un tableau désactivé** : remettre une entreprise est une décision d'admin, jamais un effet de bord. Écrit avant qu'il ne serve, parce que `listEnabled` masque le bug aujourd'hui.
- **Common Crawl est la seule source de découverte gratuite et légale** (Google a fermé son API de recherche, arrêt total au 1er janvier 2027). **Lever y est absent** : son `robots.txt` interdit le robot. Chaque candidat est vérifié sur l'API du fournisseur avant d'entrer au registre — un jeton inventé coûterait un 404 par jour, pour toujours.
- **Verified** : `turbo lint test` vert sur tout le dépôt (1273 tests API). **Non vérifié** : la découverte Common Crawl n'a jamais tourné, et aucune collecte réelle n'a été faite.

## 2026-09-23 — E19, US-111 : dédoublonnage des offres
- **Un seuil se mesure, il ne se devine pas.** Mes premiers seuils (6 bits de distance, 0,8 de similarité) venaient de l'intuition ; les tests les ont démentis. Mesures sur textes réels : pied de page ajouté = 4 bits, annonce tronquée à 60 % = 8, annonces sans rapport = 14 ; formes masculin/féminin d'un métier = 0,67 à 0,71, mots réellement différents ≤ 0,27. Les seuils retenus (10 bits, 0,70, 0,60 par mot) tombent dans des **écarts mesurés**, et le tableau des mesures est en commentaire dans `match-job.ts`.
- **Un texte court ne se prend pas en empreinte.** Deux lignes donnaient 14 bits d'écart pour un simple ajout de paragraphe ; sur une annonce de longueur réelle, le même ajout donne 4. Les fixtures de test doivent avoir la taille du vrai contenu.
- **Deux preuves valent mieux qu'une.** Intitulé *et* description doivent concorder : « Développeur Back-end » et « Développeur Front-end » d'une même entreprise partagent un texte quasi identique (5 bits) et des trigrammes proches (0,54). Seule la comparaison **mot à mot** les sépare.
- **La comparaison mot à mot doit tolérer le genre** : « développeur »/« développeuse » sont le même poste. Comparaison exacte = toute entreprise qui publie dans les deux graphies voit ses offres dédoublées.
- **Le français et l'anglais ne se rejoignent pas** par cette méthode (ni mots ni description en commun). Limite assumée, écrite dans le code et testée — la fusion passe alors par le lien partagé, qui est le cas courant.
- **La clé stricte ignore volontairement les dates** : une entreprise qui republie mot pour mot son annonce trois mois plus tard, c'est le cas « republication », et fusionner est justement ce qui empêche l'offre de revenir comme neuve.
- **Une annonce déjà connue ne se re-décide pas.** Rejouer le rattachement chaque matin ferait glisser des offres d'un groupe à l'autre au gré des seuils.
- **Défaire une fusion doit emporter les liens.** Sans cela, la collecte du lendemain refusionne l'annonce par l'étape « lien partagé », et le bouton admin ne sert à rien.
- **Verified** : 47 tests (fonctions pures + intégration PGlite), `turbo lint test` vert (1320 tests API). **Non vérifié** : aucune collecte réelle n'a encore alimenté ces tables.

## 2026-09-23 — E19, US-112 : la tâche du matin
- **`Intl` en français écrit l'heure « 08 h ».** `Number("08 h")` vaut `NaN`, et `NaN < 6` est faux : le garde-fou « attendre 6 h » laissait passer la tâche à n'importe quelle heure, sans erreur ni log. Il faut lire `formatToParts` et prendre la partie `hour`. Trouvé parce qu'un test posait l'horloge à 3 h du matin — un test d'horaire qui ne teste que l'heure nominale n'aurait rien vu.
- **Un seuil de comparaison qui reçoit `NaN` échoue toujours en silence.** À chaque fois qu'un nombre vient d'un formatage ou d'un texte, prévoir la valeur de repli du mauvais côté de la comparaison (ici : `DIGEST_HOUR - 1`, donc fermé).
- **« sur 12 mois » termine un libellé annuel** chez France Travail. Le lire comme une périodicité mensuelle transformait 55 000 € en 660 000 €. Les décimales à la française (`45000,00`) collées par une normalisation trop zélée donnaient aussi `4500000`.
- **Les crédits se débitent après la réponse du modèle, jamais avant.** Un appel en échec ne doit rien coûter, et l'ordre déterministe est un repli parfaitement acceptable — la sélection part quand même.
- **Une dimension de score qu'on ne sait pas encore calculer ne se met pas à zéro** : elle plafonnerait tous les scores (ici 85/100) et rendrait la note incomparable plus tard. Elle est simplement absente du barème jusqu'à ce que la donnée existe.
- **Un verrou peut être une ligne.** `job_digest_runs.run_date` en clé primaire : deux instances insèrent, une seule gagne. Aucune file de jobs, cohérent avec le reste du dépôt.
- **Verified** : 48 tests sur ce lot, `turbo lint build test` vert (1368 tests API, 322 web). **Non vérifié** : aucune exécution réelle — ni collecte, ni appel IA, faute d'identifiants France Travail.

## 2026-09-23 — E19, US-113 : la page « Offres du jour »
- **Vérifier dans le navigateur change ce qu'on croit avoir fait.** La page, le fil d'Ariane, l'entrée de navigation et le refus d'une offre fermée ont été regardés à l'écran, avec des offres insérées en base de développement puis retirées. Le toast « Aucun crédit n'a été consommé » et le solde inchangé sont la preuve que le garde-fou fonctionne — un test unitaire seul ne l'aurait pas montré au propriétaire.
- **Le statut « postulé » ne doit pas être acceptable depuis le client** : il découle de la création réelle de la candidature. La route de changement de statut le rejette explicitement.
- **La candidature se crée depuis le texte déjà collecté**, pas en rechargeant la page de l'annonce : le texte est déjà là, et un aller-retour réseau n'ajouterait qu'une façon d'échouer. L'URL ne sert que si le texte est trop court pour l'analyse (moins de 160 caractères).
- **Une vérification qui ne peut pas répondre ne bloque pas la candidature** (symétrique de la règle de la collecte) : sans identifiants, aucune source ne peut répondre, et refuser par défaut rendrait le bouton inutilisable.
- **Ne pas dépenser les crédits du propriétaire pour se rassurer.** Le chemin complet « Postuler » coûte un crédit et un appel modèle sur son compte : testé unitairement, signalé comme non vérifié en réel, et proposé à la demande.
- **Note d'ergonomie relevée par le propriétaire** : un libellé de case à cocher en `flex w-fit` ne peut pas revenir à la ligne — la phrase et ses liens deviennent des éléments flex. Le mettre en `block w-full` et aligner la case sur la première ligne. Corrigé pour le consentement CGU, à surveiller ailleurs.

## 2026-09-23 — E19, US-114 : notification et e-mail du matin
- **Les e-mails existants interpolaient du texte tiers sans échappement.** Titres d'offres et noms d'entreprises viennent de sources externes et d'une extraction par modèle, et partaient tels quels dans le HTML des e-mails de relance et d'achat. Corrigé sur les trois e-mails en même temps que l'ajout du nouveau — règle : dans ce dépôt, tout ce qui entre dans un corps HTML d'e-mail passe par `escapeHtml`.
- **Ne rien annoncer quand rien n'a été écrit.** Un matin sans nouvelle offre ne doit produire ni notification ni e-mail ; `createOncePerDay` garantit en plus qu'un second passage n'annonce pas deux fois.
- **Un envoi qui échoue ne doit pas coûter la sélection** : l'erreur va dans les stats du run, les offres restent sur la page.
- **Filtrer les chaînes vides d'un tableau de lignes casse la mise en page** d'un e-mail texte : les lignes vides *sont* la mise en page. Seule la ligne conditionnelle doit être conditionnelle. Vu en affichant le rendu réel, pas en relisant le code.
- **Rendre l'e-mail pour de vrai vaut mieux que l'imaginer** : un script jetable qui appelle le mailer avec un transport factice montre le sujet, le texte et le HTML en quelques secondes.
- **Verified** : 10 tests ajoutés, `turbo lint build test` vert (1386 API, 322 web). **Non vérifié** : aucun e-mail réellement envoyé (SMTP non configuré en local).

## 2026-09-23 — E19 : où se règle une recherche d'emploi
- **Retour du propriétaire sur staging** : depuis « Offres du jour », le bouton « Configurer ma recherche » envoyait dans l'éditeur de profil, où la recherche était un onglet parmi sept. Il s'y est perdu. Une configuration qui alimente une autre page mérite **sa propre page**, atteignable depuis celle qu'elle alimente — pas un onglet dans un écran qu'on ouvre pour une autre raison.
- **Découper un formulaire long en questions** (le poste, où, les secteurs, les entreprises, les alertes) plutôt qu'en une colonne de champs : c'est un écran qu'on remplit une fois et qu'on rouvre rarement.
- La recherche reste **attachée à un profil** : quand l'utilisateur en a plusieurs, la page doit dire lequel, sinon il règle la recherche d'un profil en croyant régler l'autre.
- **Les types de routes de Next sont générés** : une nouvelle route fait échouer `tsc` tant que `next build` (ou `next dev`) n'a pas régénéré `AppRoutes`. Ce n'est pas une erreur de code.

## 2026-09-23 — E19, US-115 : recherche libre dans nos offres
- **`ilike` ignore la casse, pas les accents.** « developpeur » ne trouvait rien alors que la table était pleine de « Développeur » — personne ne tape les accents dans un champ de recherche. Corrigé avec `translate(lower(col), 'àáâ…', 'aaa…')` des deux côtés, sans l'extension `unaccent` : une extension Postgres est une décision de schéma, `translate` est du SQL standard et suffit à ce volume. **Trouvé en regardant la page, pas en relisant le code.**
- **Chaque mot doit restreindre, jamais élargir** : les mots sont combinés en ET, chacun cherché dans le titre, l'annonce et le nom de l'entreprise.
- **Les critères de recherche vivent dans l'URL**, pas dans l'état du composant : on met une recherche d'emploi en favori, on la partage, on y revient avec le bouton « retour ».
- **Une offre trouvée à la main n'a pas de score** : la ligne de suivi est créée à la première action avec 0, et la carte n'affiche simplement pas le badge. Afficher « 0/100 » prétendrait qu'on l'a classée et jugée mauvaise.
- **Les actions passent par l'identifiant de l'offre, pas celui de la proposition** : une seule carte sert alors la sélection du matin et la recherche, et la ligne de suivi se crée à la volée si elle n'existe pas.
- Le bandeau « 1 Issue » de Next en dev venait d'une **extension du navigateur** qui ajoute un attribut au `<body>` (`cz-shortcut-listen`), pas de notre rendu. Vérifier la console avant d'accuser son propre code.

## 2026-09-23 — France Travail : la doc officielle tranche ce que les guides devinent
- **Quota réel : 4 appels par seconde et par application** (100 pour l'API entière, partagés). Les guides tiers annonçaient « 3 à 10 » ; la documentation de francetravail.io le dit noir sur blanc, avec `Retry-After` sur 429 et augmentation possible sur demande justifiée. Valeur par défaut corrigée (3 → 4).
- **Un access token vit 25 minutes.** Une réponse sans `expires_in` faisait expirer le jeton à l'instant même et réauthentifiait à chaque appel : repli sur la durée documentée.
- **Scope confirmé** : `api_offresdemploiv2 o2dsoffre`.
- **Parcours d'obtention** (officiel) : bouton « Utiliser l'API » sur la page de l'API → compte francetravail.io → associer l'API à une application (ou en créer une) → identifiant client + clé secrète. L'accès est libre, sous licence de réutilisation.
- Leur doc rappelle aussi la règle qu'on applique déjà : clé secrète côté serveur uniquement, jamais dans le code source.
- **Lire la doc officielle dans le navigateur quand elle est en JavaScript** : `WebFetch` ne rend que le squelette, la page ne dit rien. Le texte extrait par le navigateur a répondu en deux minutes à une question laissée ouverte depuis trois jours de travail.

### 2026-09-23 — Un script `tsx` ne lit pas `.env` tout seul
- **Constat** : `ft:smoke` échouait sur « identifiants requis » alors que `.env` était renseigné. Seuls `main.ts` et `migrate.main.ts` chargeaient l'environnement, chacun avec sa propre copie du code ; les trois scripts du sprint 025 n'en avaient aucune.
- **Leçon** : tout nouvel entrypoint doit appeler `loadEnvironmentFiles()` (`src/shared/env.ts`, extrait des deux copies existantes). Un script lancé par `tsx` part d'un environnement vide.
- **Leçon** : `pnpm run` transmet le séparateur `--` comme un argument réel. Une commande documentée avec `--` faisait chercher « -- » comme mots-clés. Les scripts filtrent l'argument et la documentation ne l'utilise plus.
- **Leçon** : une erreur d'authentification sans le corps de la réponse ne se diagnostique pas. `invalid_client` (identifiant refusé) et `invalid_scope` (API non souscrite) donnent le même 400. Le corps est désormais repris dans le message.
- **Verified** : 1 403 tests API, lint et build verts ; appel réel à France Travail qui atteint bien leur serveur et renvoie `invalid_client` — mêmes identifiants refusés par un `curl` direct, donc l'implémentation est conforme à la doc (endpoint, corps, scope vérifiés sur francetravail.io).

### 2026-09-23 — Les codes France Travail vérifiés sur la vraie API
- **Constat** : avec les identifiants en place, l'API est accessible. Les référentiels
  `typesContrats`, `naturesContrats` et `secteursActivites` donnent la vérité, et une recherche
  comptée (en-tête `Content-Range`) prouve chaque filtre.
- **Confirmé** : CDI/CDD/MIS/LIB, natures E2 (apprentissage) et FS (professionnalisation),
  `secteurActivite` = divisions NAF à 2 chiffres, listes séparées par virgule partout, 400 sur un
  code inconnu. `typeContrat` et `natureContrat` sont **unis** (878 + 67 = 940, moins 5 recoupées).
- **Corrigé** : `experience` va de 0 à 4. Un débutant relève du **4** (« débutant accepté », 678
  offres) et non du 1 (« moins d'un an **exigé** », 43 offres) — la plus grosse réserve d'offres
  était donc cachée aux débutants. Mapping élargi : junior `2,4`, confirmé `2,3`, senior `3`.
- **Leçon** : le stage n'a aucun code de contrat chez France Travail. Sur 129 annonces dont le titre
  annonce un stage, 56 sont publiées en CDI. Ne jamais mapper stage → CDD : c'est `classifyContract`
  qui tranche chez nous.
- **Leçon** : un code faux ne lève pas d'erreur, il renvoie une page vide. `ft:smoke` exerce
  maintenant chaque filtre et signale (⚠️) tout volume nul.
- **Leçon (sur moi)** : j'avais « prouvé » la veille avec un `curl` que nos identifiants étaient
  refusés — mais `. ./.env` sous zsh n'avait rien chargé et j'envoyais des champs vides. Pour lire
  le `.env` dans une sonde, passer par Node et `process.loadEnvFile`, jamais par le sourcing shell.
- **Verified** : `ft:smoke` réel — 25 offres, vérification en direct `true`, filtres 39/67/4/678.

### 2026-09-23 — L'image de production n'a pas `tsx`
- **Constat** : `pnpm --filter @cvforge/api job-digest:run` échoue en staging avec `tsx: not found`.
  L'image installe `--prod` : les scripts en TypeScript ne peuvent pas y tourner.
- **Leçon** : tout script d'exploitation destiné au conteneur doit viser le code compilé —
  `node apps/api/dist/apps/api/src/<chemin>.main.js` depuis `/workspace` (c'est ce que fait déjà
  le `CMD` du Dockerfile). Variantes `*:built` ajoutées dans `apps/api/package.json`.
- **Leçon** : trois services lancent une tâche de fond dès `onModuleInit` (purge entretiens, purge
  ATS, alerte de solde OpenRouter). Un script qui ferme la base juste après voyait cette tâche
  échouer sur un pool mort et afficher une trace qui ressemblait à un échec du script.
  `onModuleDestroy` attend désormais le travail lancé au démarrage ; test dédié.

### 2026-09-23 — « La collecte a tourné » n'est pas « la collecte a trouvé »
- **Constat** : en staging, `/offres` était vide et le script répondait « la collecte du jour a déjà
  été faite ». Les deux étaient vrais : la journée est verrouillée **avant** d'appeler la moindre
  source, donc un passage qui ne collecte rien la garde quand même.
- **Cause** : la collecte ne construisait ses requêtes qu'à partir des recherches dont le digest est
  activé (`listDigestEnabled`). Aucune recherche configurée ⇒ aucune requête ⇒ aucune offre, quelles
  que soient les sources. Corrigé : on collecte pour **toutes** les recherches (`listAll`), la
  sélection et l'e-mail restent réservés au digest.
- **Leçon** : une fonctionnalité qui sert à tous ne doit pas dépendre d'un réglage individuel. La
  page « chercher dans notre base » n'avait de contenu que si quelqu'un avait activé l'e-mail.
- **Leçon** : un état vide doit distinguer « ta recherche ne donne rien » de « nous n'avons rien ».
  `searchJobs` renvoie désormais `available`, le volume détenu hors critères.
- **Leçon** : sans observabilité, ce diagnostic était de la devinette. `job-digest:status` affiche
  les compteurs et les `stats` des dernières collectes ; c'est lui qui a tranché en une commande.
- **Leçon (sur moi)** : `vitest` ne typecheck pas. Un double de test complété sans mettre à jour son
  interface passe les tests et casse `pnpm build`. Lancer `tsc --noEmit` avant de conclure.

### 2026-09-23 — Une variable saisie dans l'UI Dokploy n'arrive pas au conteneur
- **Constat** : `FRANCE_TRAVAIL_CLIENT_ID` renseignée dans l'interface Dokploy, et le script dans le
  conteneur la voyait absente.
- **Deux causes cumulées** : (1) un service compose ne reçoit **que** les variables que son propre
  bloc `environment:` nomme — `dokploy-stack.yml` les énumère une par une ; (2) le fichier
  d'environnement de la stack est **écrit par Terraform** (`infra/dokploy/compose.tf`), donc toute
  saisie manuelle est effacée au déploiement suivant.
- **Chaîne complète à compléter pour une nouvelle variable** : `variables.tf` → `compose.tf` (env) →
  bloc `environment:` du service dans `dokploy-stack.yml` → `TF_VAR_*` dans
  `.github/workflows/deploy.yml` → secret GitHub par environnement → `docs/deploy.md`.
- **Leçon** : `process.loadEnvFile` **n'écrase pas** une variable déjà définie (vérifié). Un `.env`
  resté dans une image ne peut donc pas masquer la configuration du déploiement.
- **Leçon** : un diagnostic doit nommer ce que le processus voit. `job-digest:status` liste
  désormais les variables attendues (présente/absente et longueur, jamais la valeur) et le fichier
  `.env` éventuellement lu — c'est ce qui a rendu le problème visible en une commande.

### 2026-09-23 — Deux plafonds France Travail qui ne se devinent pas
- **Constat** : en staging, `400 pour la plage 0-149` sur chaque requête, donc zéro offre malgré des
  identifiants valides. Le message ne portait pas le corps de la réponse : impossible de conclure.
  Corrigé d'abord (message + requête rejetée), la cause est apparue en une exécution.
- **`secteurActivite` : 2 divisions NAF au maximum.** Au-delà, 400 et la requête entière est perdue.
  La plupart de nos secteurs en ont 3 (Finance 64/65/66, Santé 86/87/88), donc le filtre cassait dès
  qu'un candidat cochait un secteur. Au-delà de 2, on abandonne le filtre et on collecte plus large.
- **`publieeDepuis` : 1, 3, 7, 14 ou 31 uniquement.** Arrondi à la valeur supérieure autorisée.
- **Leçon** : tous les paramètres de liste ne se comportent pas pareil. `typeContrat` accepte 4
  valeurs, `natureContrat` 3, `experience` 3, `departement` 2 (et plus) — seul `secteurActivite` est
  plafonné. Ne jamais généraliser d'un paramètre à l'autre : mesurer.
- **Leçon** : un filtre qu'on ne peut pas exprimer doit être abandonné, pas approximé. Envoyer
  arbitrairement les 2 premières divisions aurait silencieusement amputé la recherche.
- **Leçon** : `searchJobs` datait une offre à sa date de collecte. Un import rétroactif aurait
  affiché un mois d'annonces comme publiées le jour même. L'âge lit la plus ancienne des deux dates,
  comme `ageInDays` le faisait déjà côté score — une règle métier ne doit exister qu'à un endroit.
- **Verified** : la requête exacte qui échouait (5 divisions NAF) ramène 1 offre sur la veille et 10
  sur 30 jours, via l'adaptateur compilé contre la vraie API.

### 2026-09-23 — Un registre vide ne lève aucune erreur
- **Constat** : les adaptateurs Greenhouse/Lever/Ashby/SmartRecruiters étaient écrits, testés, et ne
  produisaient rien depuis le début : `BoardsService.collect()` lit `job_boards`, restée vide.
  Aucune erreur, aucun signal — seul le compteur `boardsRead: 0` le disait.
- **Leçon** : une fonctionnalité qui dépend d'un référentiel à remplir doit livrer de quoi le
  remplir, sinon elle est inerte le jour de la mise en production. Ici : une liste de départ dans
  le code, plus une alimentation automatique par les liens d'origine des offres France Travail.
- **Leçon** : vérifier avant d'écrire. Sur ~60 jetons d'entreprises plausibles, **deux tiers
  répondaient 404** et trois grands groupes français servaient un tableau vide. Une liste écrite de
  mémoire aurait été fausse aux deux tiers. Le filtre retenu est celui de la découverte : garder
  seulement si le tableau publie au moins une offre en France ou en télétravail.
- **Leçon** : enregistrer une entreprise **après** la lecture des tableaux, pas avant. Un jeton non
  encore vérifié interrogé dans la foulée renvoie 404, et `recordFetch(gone)` le retire aussitôt.
- **Leçon** : préférer un fichier TypeScript à un JSON pour une donnée livrée avec le code —
  `include` ne couvre que `src/**/*.ts`, un JSON ne serait pas copié dans `dist` et le script
  compilé planterait dans le conteneur. En prime, un fournisseur mal orthographié casse le build.
- **Verified** : 412 annonces, 395 offres uniques collectées en local depuis 22 entreprises.

### 2026-09-23 — Un module partagé ne doit pas traîner le client d'API dans le navigateur
- **Constat** : avoir déplacé `SOURCE_LABELS` dans `lib/job-search.ts` pour le partager avec l'admin
  a cassé `next build`. Ce fichier importe `@/lib/api`, réservé au serveur ; un composant client qui
  y prend une simple constante embarque tout le client d'API.
- **Leçon** : séparer le **vocabulaire** (`lib/job-labels.ts`, aucun import) des **accès données**.
  Un `import type` est effacé à la compilation et ne pose pas ce problème ; une constante, si.
- **Leçon** : dans ce dépôt, une page appelle `api<T>()` elle-même. Mes fonctions `loadX()` dans un
  module partagé recréaient exactement le même piège — supprimées.
- **Leçon** : `next build` est le seul garde-fou pour cette classe d'erreur. `vitest` et
  `tsc --noEmit` passaient tous les deux.
- **Verified** : `/admin/job-search` dans le navigateur — 22 entreprises avec leurs compteurs réels,
  désactivation et réactivation effectives, onglet Doublons correct.

### 2026-09-23 — Un verrou journalier n'est pas un verrou d'exécution
- **Constat** : `job_digest_runs.run_date` en clé primaire servait de verrou *et* d'historique. Les
  deux rôles sont incompatibles : une seule ligne par jour interdit tout historique, et une collecte
  manuelle écrasait les statistiques du matin. Pire, `--force` supprimait la ligne avant de la
  recréer — deux exécutions pouvaient donc tourner ensemble.
- **Solution** : identité propre (uuid) + **deux index uniques partiels**. `(run_date) where kind =
  'digest'` garantit une sélection par jour ; `(status) where status = 'running'` garantit une
  exécution à la fois — toutes les lignes en cours partagent la même valeur, donc l'unicité n'en
  laisse qu'une. Le verrou reste dans la base, comme il doit l'être avec plusieurs instances.
- **Leçon** : un verrou pris avant tout travail doit prévoir le processus qui meurt. Une ligne
  `running` orpheline bloquait la collecte pour toujours ; elle est désormais déclarée échouée
  au-delà de deux heures.
- **Leçon** : séparer ce qui collecte de ce qui notifie **avant** d'exposer un bouton. Sinon un test
  de source envoie des e-mails à tous les utilisateurs.
- **Leçon** : le « fire-and-forget » d'une tâche longue appartient au service, pas au contrôleur —
  `no-unresolved-promises.test.ts` refuse une promesse capturée dans un contrôleur, et une promesse
  rejetée non gérée tue le processus Node.
- **Leçon** : une migration Drizzle écrite à la main a besoin de `--> statement-breakpoint` entre
  chaque instruction, sinon PGlite répond « cannot insert multiple commands into a prepared
  statement ». Et ne jamais découper ce fichier en coupant sur « ; » : un commentaire en contient.
- **Verified** : 6 tests du verrou sur une vraie base, et dans le navigateur une collecte lancée,
  suivie jusqu'à « Terminée », sans toucher aux chiffres de la passe du matin.

### 2026-09-23 — Une table de référence ne doit pas redire ce que le code sait
- **Constat** : j'avais pré-rempli `job_sources` par migration avec les onze sources connues. Les
  tests l'ont révélé (le `reset()` des tests tronque tout), mais le vrai problème était ailleurs :
  la liste des sources existait alors à deux endroits, SQL et TypeScript, à tenir en phase à la main.
- **Solution** : le code porte la liste (`jobSources`), la table ne stocke que les **dérogations** et
  le dernier résultat. Le contrôleur compose les deux. `setEnabled` et `recordRun` font un upsert.
- **Leçon** : pour un réglage qui doit « échouer ouvert », exposer le **négatif**. `listDisabled()`
  permet qu'une source sans ligne soit active ; un `listEnabled()` aurait silencieusement ignoré
  toute source ajoutée plus tard.
- **Leçon** : un interrupteur en base est invisible si les adaptateurs sont construits une fois au
  démarrage du module. Le filtrage doit se faire **à l'exécution**, et dans *tous* les chemins —
  la collecte, mais aussi `isStillOpen`, qui est appelé juste avant de débiter un crédit.
- **Leçon** : si un écran affiche une colonne, quelque chose doit la remplir. Les fournisseurs ATS
  seraient restés « jamais appelés » parce que seul le tour des sources globales appelait
  `recordRun` ; `BoardsService` rapporte maintenant par fournisseur.
- **Verified** : Greenhouse coupé depuis l'admin, collecte relancée — 22 → 18 entreprises lues,
  414 → 283 annonces. Une erreur d'hydratation observée au passage vient d'une extension du
  navigateur (`cz-shortcut-listen` sur `<body>`), pas du code.

### 2026-09-23 — L'état d'une interface partagée appartient à l'URL, pas au composant
- **Constat** : la refonte des pages d'offres demandait un panneau de détail ouvert au clic. Le
  mettre dans un `useState` aurait marché, et cassé le bouton Retour du navigateur : sur une page
  de recherche d'emploi, revenir en arrière est le geste le plus fréquent.
- **Solution** : l'offre ouverte vit dans `?offre=<id>`, mais lue **côté client** (`useSearchParams`)
  et jamais côté serveur — ces pages sont en `no-store`, une lecture serveur aurait rappelé l'API à
  chaque ouverture et chaque fermeture d'un panneau dont tout le contenu était déjà là.
- **Leçon** : `disabled` sur un `<a>` ne désactive rien. Les deux flèches de pagination étaient
  cliquables, « Précédente » en page 1 renvoyait à la page 1. C'est `aria-disabled` plus
  `pointer-events-none`.
- **Leçon** : un constructeur d'URL qui énumère les paramètres connus en efface d'autres en
  silence. Rendre `pageHref` générique sur ce qui est présent ; ce qu'il faut retirer se retire
  alors explicitement, et se lit.
- **Leçon** : une carte dans une grille doit être **comparable à ses voisines**. Ce qui est
  variable en hauteur (un lieu qui liste douze villes) se coupe à deux lignes sur la carte et
  s'affiche en entier dans le panneau.
- **Verified** : en local sur la vraie base (128 offres) — trois colonnes, panneau avec la
  description, pagination numérotée, retour arrière qui referme sans perdre le défilement.
  `/offres-du-jour` seulement dans son état vide : le compte local n'a pas de sélection.

### 2026-09-23 — Lire le contrat d'une API avant d'écrire l'adaptateur, pas après
- **Constat** : j'allais calquer « La bonne alternance » sur France Travail, avec des mots-clés et
  une pagination. Sa description OpenAPI en direct dit l'inverse : **aucun paramètre de mots-clés**
  (ROME, RNCP, diplôme, point et rayon, départements), et une réponse plafonnée à 150 offres par
  source qu'il est explicitement impossible de dépasser. Un adaptateur écrit de mémoire aurait
  envoyé un paramètre ignoré et paginé dans le vide.
- **Leçon** : quand une API ignore une dimension de la requête, plusieurs de nos requêtes deviennent
  le **même appel**. Il faut alors un cache par clé d'appel réelle, sinon le quota part en doublons.
- **Leçon** : une source qui ne renvoie qu'un type de contrat ne doit pas être appelée pour les
  requêtes qui n'en veulent pas — le filtrage se fait avant l'appel, pas sur les résultats.
- **Leçon** : `isStillOpen` doit répondre `null` pour tout identifiant que l'API ne connaît pas.
  Ici les offres relayées portent l'identifiant du partenaire ; leur 404 lu comme « fermée » aurait
  supprimé des offres vivantes. Préfixer ces identifiants à la cartographie évite de demander.
- **Leçon** : un 200 ne veut pas dire « ouverte ». Leur endpoint sert aussi les offres pourvues et
  annulées ; c'est le champ `status` qui tranche.
- **Verified** : appel réel avec une clé invalide — 401 « Impossible de déchiffrer la clé d'API »,
  donc l'URL et l'en-tête sont bons. Aucune réponse réelle capturée : il n'y a pas encore de clé.

### 2026-09-23 — Une clé de bac à sable ne renvoie pas les mêmes données qu'une vraie
- **Constat** : la clé sandbox de La bonne alternance interroge leur **environnement de recette**.
  Onze offres sur 311 portaient un lien `labonnealternance-recette.*`, non public. Une collecte
  réelle lancée avec elle aurait planté ces liens dans la base des candidats jusqu'à expiration.
- **Leçon** : une clé d'essai sert à prouver le branchement, jamais à remplir une table que des
  utilisateurs vont lire. Le dire dans `.env.example` et `docs/deploy.md`, pas seulement le savoir.
- **Leçon** : 590 appels réels ont appris ce qu'aucun test sur schéma ne pouvait dire — 266 offres
  sur 311 sont relayées de France Travail avec *exactement* l'URL que notre propre source construit
  (le dédoublonnage les fusionne, vérifié par `urlKey()`), `contract.remote` est `null` 99 fois sur
  100, et `identifier.id` est toujours présent, donc la branche défensive `partner:` n'a jamais été
  exercée en vrai. Il faut le dire plutôt que de laisser croire qu'elle l'a été.
- **Leçon** : leur filtre par département suit le **point GPS**, pas l'adresse. Deux offres demandées
  en 75 avaient une adresse à Saint-Étienne et à Cayenne. Quand deux champs d'un tiers se
  contredisent, choisir celui que l'écran affiche — ici l'adresse — et consigner l'écart.

### 2026-09-23 — Une adresse qui répond n'est pas l'entreprise qu'on cherche
- **Constat** : pour élargir le registre au-delà de 22 entreprises, j'ai deviné les adresses de
  tableaux d'emploi à partir des noms. `ashbyhq.com/vinci` répond 200 avec 27 offres — c'est une
  startup d'IA de Palo Alto, pas le groupe de BTP. `greenhouse.io/air` est une société de Virginie.
  J'ai failli enregistrer la première sous le nom « Vinci ».
- **Leçon** : « l'API répond » n'est pas une vérification d'identité. Il faut un signal qui
  distingue l'homonyme, et ici c'est la **géographie des offres**, mesurée : 0/9 et 2/27 pour les
  imposteurs, 49/60, 46/60 et 81/83 pour les vraies. Le filtre « France ou télétravail » des
  adaptateurs ne suffisait pas : le faux Vinci a des postes en télétravail.
- **Leçon** : un compte seul accepte une entreprise étrangère avec un bureau à Paris ; une part
  seule accepte un tableau d'une offre. C'est la **conjonction** des deux qui sépare les cas.
- **Leçon** : quand on ajoute une provenance à des données, l'écran qui l'affiche doit pouvoir dire
  la vérité. D'où une origine `probe` distincte de `seed`, `crawl` et `admin`, et la migration qui
  va avec — pas un réemploi approximatif d'une valeur existante.
- **Leçon de méthode** : sonder 117 employeurs de tous secteurs a montré que les gros employeurs
  français **ne sont pas absents** de ces outils (Eurofins, Accor, Sodexo, Kiabi, Saint-Gobain),
  contrairement à ce que j'aurais répondu de mémoire. Mesurer avant d'affirmer.

### 2026-09-23 — US-122 : une couche France Travail, et un 403 qui veut dire « pas accordé » (stage 01 · [[workflows/runs/developer-20260923225823]])
- **Context** : [[sprints/sprint-026#^us-122]] · [[workflows/runs/developer-20260923225823/01-developer]] · [[decisions/ADR-024-france-travail-platform-rome]]
- **Did** : `apps/api/src/france-travail/` (config, jeton par scope, client typé, module, `ft:smoke <api|all>`) ; `FranceTravailSource` migrée ; limiteur déplacé dans `shared/rate-limit/`.
- **Leçon** : `ft:smoke all` a tranché en deux minutes ce que le catalogue illisible laissait ouvert. Les scopes ROME (`api_rome-<api>v1 nomenclatureRome`) et ROMEO (`api_romeov2`) sont bons. ROMEO exige `options.nomAppelant` et accepte plusieurs textes par appel.
- **Leçon** : La Bonne Boîte **délivre le jeton** puis répond 403 « Invalid scope » à chaque appel. Un `invalid_scope` ne se voit donc pas toujours au jeton ; le client traite le 403 comme une API non accordée et l'éteint jusqu'au redémarrage.
- **Leçon** : deux `buildJobSources()` dans le module, c'étaient deux jetons et deux limiteurs pour le même quota. Une liste d'adaptateurs partagée corrige les deux.
- **Open** : quotas ROME et ROMEO inconnus (1/s par défaut) ; accès La Bonne Boîte à demander à France Travail.

### 2026-09-23 — US-123 : le référentiel ROME en trois appels, et une API qui dit oui au jeton puis non (stage 01 · [[workflows/runs/developer-20260923232118]])
- **Context** : [[sprints/sprint-026#^us-123]] · [[workflows/runs/developer-20260923232118/01-developer]]
- **Did** : `apps/api/src/rome/`, migration 0028, `rome:sync`. Synchro réelle rejouée trois fois.
- **Leçon** : sonder avant de concevoir a divisé le coût par 600. Le plan naturel (une fiche par métier, 1 911 appels à 1/s) prenait 30 minutes ; le paramètre `champs` sur les listes donne tout en trois appels et 10 s. Tous les attributs ne sont pas sélectionnables (`type`, `obsolete` : 400 SELECTOR), donc les compétences viennent de leur propre liste.
- **Leçon** : les listes ne contiennent que les codes vivants. Un code absent du téléchargement est un code retiré ; on le signale, on ne le supprime jamais chez l'utilisateur sur une supposition.
- **Leçon** : sur la passerelle France Travail, 401 « TypeAuth invalide » veut dire « produit inconnu à ce chemin », 403 vide « produit connu, accès non accordé ». C'est ce qui a permis de dire que Substitutions attend un droit, et non qu'on se trompe de chemin.
- **Leçon** : le point médian (·) est un diacritique pour Unicode : « ingénieur·e » devient « ingenieure », ce qui arrange la recherche.
- **Open** : adaptateur Substitutions à écrire quand l'accès sera ouvert ; `ROME_CODE_HOLDERS` vide jusqu'à US-118.

### 2026-09-24 — US-118 (developer · [[workflows/runs/analyze-design-dev-review-20260923233426]])
- **Context** : [[sprints/sprint-026#^us-118]]
- **Learned** : Classer au seul score laisse un texte prendre toutes les places : on prend les réponses tour à tour entre les textes. Un textarea contrôlé qui se reconstruit à chaque frappe à partir de lignes nettoyées avale espaces et retours à la ligne : il faut garder le texte brut. En développement, un clic avant l'hydratation ne fait rien ; vérifier la requête POST, pas seulement le toast.

### 2026-09-24 — US-124 : le ROME complète les mots-clés, il ne les remplace pas (stage 01 · [[workflows/runs/developer-20260924080225]])
- **Context** : [[sprints/sprint-027#^us-124]] · [[workflows/runs/developer-20260924080225/01-developer]]
- **Leçon** : le sprint prévoyait de remplacer les mots-clés par le ROME quand un métier est confirmé. La mesure dit l'inverse : les mots-clés de France Travail couvrent déjà le libellé ROME quand les mots concordent, et en ramènent souvent plus. Le ROME n'apporte que lorsque le candidat ne parle pas comme les annonces (+16 pour « Ingénieur logiciel »). D'où l'union.
- **Leçon** : pour comparer deux recherches, il faut paginer jusqu'au bout. À 150 résultats par page, un « +50 » peut n'être qu'un effet de page.
- **Leçon** : le sprint listait le SIRET et le code d'appellation « quand ils sont présents » ; ils ne le sont jamais. Mesurer avant de créer une colonne.
- **Leçon** : toucher un fichier au-delà de 400 lignes oblige à le découper. Garder le constructeur public intact (le digest crée son collecteur en interne) a épargné les 30 tests du digest.

### 2026-09-24 — US-125 : les compétences du CV par ROMEO (stage 01 · [[workflows/runs/developer-20260924085500]])
- **Context** : [[sprints/sprint-027#^us-125]] · [[workflows/runs/developer-20260924085500/01-developer]]
- **Leçon** : aucun seuil de score ne sépare le bruit de ROMEO du juste (« Doctorat » à 0,83, au-dessus de vraies compétences). Un retrait humain définitif vaut mieux qu'un seuil.
- **Leçon** : une empreinte n'est enregistrée que si ROMEO a répondu ; sinon une panne passagère figerait un profil sans compétences jusqu'à sa prochaine modification.
- **Leçon** : ne jamais envoyer à une API externe le contenu de profils réels de la base locale pour mesurer, même en dev ; utiliser des textes fictifs.
- **Leçon** : `prettier` lancé depuis `apps/api` sur `packages/types` applique la mauvaise config ; relancer depuis le paquet ou vérifier le diff.

### 2026-09-24 — US-126 : le score ROME (stage 01 · [[workflows/runs/developer-20260924100500]])
- **Context** : [[sprints/sprint-027#^us-126]] · [[workflows/runs/developer-20260924100500/01-developer]]
- **Leçon** : 35 000 compétences ROME, et ROMEO ne tombe que rarement sur le code exact d'une fiche métier. Comparer les codes seuls ne voit presque rien ; il faut aussi comparer les libellés, en ignorant les mots de cadrage (« règles », « respecter », « techniques »).
- **Leçon** : un essai à blanc sur la base locale (scorer sans écrire) a trouvé le faux positif que les tests n'avaient pas ; le garder comme étape avant de cocher une story de score.
- **Leçon** : ne pas démarrer `AppModule` dans un script ponctuel : le minuteur du digest peut envoyer les e-mails du matin. Ouvrir la base avec `createDatabaseClient`.
- **Leçon** : le code d'`apps/api` n'est pas formaté par prettier (lignes jusqu'à 90) ; lancer prettier sur un fichier existant ajoute du bruit. Le réserver aux fichiers neufs.

## 2026-09-24 — Scopes France Travail corrigés (INC2741452)
- Scopes donnés par le support : La Bonne Boîte `api_labonneboitev2 search office`, ROME Substitutions `api_rome-substitutionsv1 nomenclatureRomeSubstitutions` (ajoutée au catalogue `ft.config.ts`, non vérifiée).
- Avec ces scopes le jeton est délivré, mais les appels répondent toujours 403 `WWW-Authenticate: insufficient_scope` : habilitation à obtenir côté France Travail, incident à rouvrir.
- **Leçon** : `source .env` altère le secret FT (caractère interprété par le shell → `invalid_client`) ; utiliser `node --env-file=../../.env --import tsx src/france-travail/ft-smoke.main.ts <api>`.

### 2026-09-24 — US-127 : les pistes jusqu'au CV (stage 01 · [[workflows/runs/developer-20260924110500]])
- **Context** : [[sprints/sprint-027#^us-127]] · [[workflows/runs/developer-20260924110500/01-developer]]
- **Leçon** : pour un ajout qui traverse un fichier trop gros (`applications.service.ts`, 767 lignes), passer par une dépendance plus petite (le magasin) plutôt que de toucher le fichier et de devoir le découper hors périmètre.
- **Leçon** : une consigne au modèle se teste deux fois : le texte du prompt, et un modèle simulé qui désobéit, pour prouver que le serveur rattrape.
- **Leçon** : un contrôle visuel des offres du jour n'exige pas de lancer le digest (qui envoie des e-mails) : écrire quelques correspondances locales pour le compte de dev, puis les supprimer.

## 2026-09-24 — Landing : refonte UX de l'analyse ATS (/fr/analyse-ats)
- Drop zone (`components/ats/cv-drop-zone.tsx`) : toute la zone est le `<label>` de l'input `sr-only`, drag & drop, carte fichier, shake sur refus.
- Vague de l'app reprise via `components/ats/spark-pending.tsx` (miroir de `PendingContent` d'apps/web) sur « Analyser » et « Afficher le rapport ».
- `scan-progress.tsx` : étapes cadencées côté client, la dernière tourne jusqu'à la réponse (jamais « fini » avant l'API).
- Jauge : remplissage CSS (`gauge-fill`, part de `--gauge-from`) + compteur `motion` ; le SSR garde les valeurs finales (tests SSR inchangés).
- `UnlockedReport` extrait dans `unlocked-report.tsx` (barres `bar-fill`, icônes par sévérité), `bandFor` dupliqué depuis @cvforge/ats-score (landing n'en dépend pas).
- Piège : l'API limite les scans par IP en local ; pour tester l'animation, mocker `/api/ats-scan` (Playwright `page.route`, Chrome système via `executablePath`). Un onglet Claude-in-Chrome en arrière-plan ne fait pas tourner rAF.

### 2026-09-24 — US-128 : radar marché (stage 01 · [[workflows/runs/developer-20260924121500]])
- **Context** : [[sprints/sprint-027#US-128]] · [[workflows/runs/developer-20260924121500/01-developer]]
- **Leçon** : l'API Marché du travail se découvre par ses référentiels (`GET /referentiel/indicateurs`, `nomenclatures`, `activites`, `territoires`) ; chaque indicateur exige son `codeTypeNomenclature` (TYPE_TENSION, ORIGINEOFF, CATCAND…), sinon 400 « nomenclature non disponible ».
- **Leçon** : « pas de donnée » arrive en 500 « n'a pas pu trouver la liste » ou en 200 sans `listeValeursParPeriode` : ce n'est pas une panne ; une vraie panne garde les chiffres du mois d'avant.
- **Leçon** : pas de salaire par ROME dans cette API (FAP seulement, sans table ROME→FAP accessible) ; médiane sur nos offres, avec sa propre source.
- **Leçon** : en zsh, `set -- $var` ne découpe pas les mots ; utiliser `${=var}`, sinon les sondes envoient des corps faux et on accuse l'API.

### 2026-09-24 — US-123 : substitutions ROME (stage 01 · [[workflows/runs/developer-20260924124500]])
- **Context** : [[sprints/sprint-026#US-123]] · [[workflows/runs/developer-20260924124500/01-developer]]
- **Leçon** : un 403 France Travail peut venir d'un chemin faux, pas seulement d'un droit manquant (La Bonne Boîte et Substitutions, INC2741452). Demander au support les chemins exacts avant de conclure à une habilitation.
- **Leçon** : sans liste de substitutions, ne demander que les codes qui comptent : ceux qu'un utilisateur stocke encore et que le nouveau référentiel a perdus.

### 2026-09-24 — US-116 / US-119 : La Bonne Boîte (stage 01 · [[workflows/runs/developer-20260924130000]])
- **Context** : [[sprints/sprint-026#US-119]] · [[workflows/runs/developer-20260924130000/01-developer]]
- **Leçon** : La Bonne Boîte renvoie ses paramètres effectifs (`params`, `resolved_params`) : les lire suffit pour voir qu'un paramètre a été mal compris (`rome=A,B` devient un seul code et rend 0 résultat ; `department=44` rend 0 alors que `department_number=44` fonctionne).
- **Leçon** : pour distinguer une racine d'API existante d'une racine inventée, comparer les codes : 403 pour la bonne racine sans les droits ou avec un mauvais chemin, 401 « TypeAuth invalide » pour une racine inconnue (Pages employeurs).
- **Leçon** : une table des requêtes à part de leurs résultats permet de distinguer « lu, personne trouvé » de « jamais lu » : sinon, une requête sans résultat serait relancée à chaque passage.

### 2026-09-24 — US-120 : candidature spontanée (stage 01 · [[workflows/runs/developer-20260924140000]])
- **Context** : [[sprints/sprint-026#US-120]] · [[workflows/runs/developer-20260924140000/01-developer]]
- **Leçon** : un nouveau type de candidature passe par une nouvelle valeur de `sourceType` et par le magasin, sans toucher `applications.service.ts`. La génération le reconnaît dans `offerContextOf`.
- **Leçon** : après l'ajout d'une constante dans `@cvforge/types`, reconstruire le paquet avant les tests de l'API : sinon la constante vaut `undefined` à l'exécution, et les tests échouent sans erreur de type.
- **Leçon** : quand une autre session travaille en parallèle dans le dépôt, n'ajouter au commit que ses propres fichiers, un par un (`git add <fichiers>`), jamais `git add -A`.

### 2026-09-24 — Refonte UI/UX de /ma-recherche (ad hoc, hors sprint)
- **Context** : la page empilait critères, métiers ROME, compétences, marché et alertes dans une colonne, avec deux façons d'enregistrer. Elle est découpée en quatre sous-pages (Critères · Métiers & compétences · Marché · Alertes) sous un layout commun, avec une seule façon d'enregistrer par onglet.
- **Leçon** : un composant serveur ne peut pas appeler une fonction exportée par un module `"use client"`, même une fonction pure (`searchTabHref`) : la page plante au rendu, et ni tsc ni les tests (`renderToStaticMarkup`) ne le voient. Les helpers partagés vont dans un module sans directive (`search-tabs.ts`).
- **Leçon** : un layout ne reçoit pas les `searchParams`. Le sélecteur de profil et les onglets lisent `?profileId` avec `useSearchParams`, sous `<Suspense>`.
- **Leçon** : quand deux onglets écrivent le même objet (les critères et les alertes dans `SearchProject`), chaque action serveur relit l'objet stocké et n'écrit que sa part (`pickAlerts`), avec une lecture qui échoue (`readSearchProject`). Un projet vide de repli écraserait le reste.
- **Leçon** : `Card` a `overflow-hidden` : une liste déroulante en position absolue à l'intérieur est coupée, il faut `overflow-visible` sur cette carte.

### 2026-09-24 — US-121 fiche entreprise et badges RSE (sprint-026)
- **Context** : table `companies` indexée par SIREN, lue chaque mois depuis l'Annuaire des entreprises et Egapro. Les cartes affichent des badges, et la page `/entreprises/[siret]` donne la fiche.
- **Leçon** : l'API Recherche d'entreprises ne donne pas l'index Egapro, seulement `egapro_renseignee`. La note vient de `egapro.travail.gouv.fr/api/search?q=<siren>` (`notes.<année>`, parfois null) : n'appeler Egapro que si l'index est déclaré.
- **Leçon** : pour tirer une file de travail d'une autre table, une requête `selectDistinct` avec `left join`, `refreshed_at < cutoff` et `limit` suffit. Pas besoin de liste intermédiaire.
- **Leçon** : en dev, `notFound()` dans une page Next répond 200 en streaming. Vérifier `NEXT_HTTP_ERROR_FALLBACK;404` dans le HTML, pas le code HTTP.

### 2026-09-24 — US-117 mesure SIRET → ATS (sprint-026)
- **Context** : mesure sur 100 entreprises. Résultat : 6 % de tableaux collectables, donc la chaîne n'est pas industrialisée ([[spikes/SPIKE-005-siret-ats-yield]]).
- **Leçon** : SmartRecruiters répond 200 avec `totalFound: 0` pour n'importe quel identifiant. Un sondage par nom doit exiger au moins une offre et vérifier le nom et la ville, car 3 correspondances sur 8 étaient des homonymes étrangers.
- **Leçon** : `detectAtsBoard` renvoie le jeton générique `company` sur certaines URL SmartRecruiters. C'est à corriger au prochain passage dans ce fichier.
- **Leçon** : `tsx` sur un script `.ts` hors du paquet compile en CommonJS, donc sans await au premier niveau. Nommer le script `.mts` et importer le module TS avec `import * as`.

### 2026-09-24 — Refonte UI/UX de /profile, et en-tête fixe dans toute l'app (ad hoc, hors sprint)
- **Context** : même découpage que `/ma-recherche`. À gauche, en colonne fixe : les profils, le sommaire des sections et l'import de CV. À droite : une carte par section au lieu de 7 onglets, un seul enregistrement, et une barre d'enregistrement fixe. Le shell ne fait défiler que le contenu, et `PageHeader` reste collé en haut sur toutes les pages.
- **Leçon** : `SectionCard` et `SectionOutline` (`components/layout/`) servent au sommaire et aux cartes de tout formulaire long. Réutiliser ces deux composants au lieu d'en écrire un par page.
- **Leçon** : dans une colonne flex de hauteur bornée (`min-h-0`), une `Card` (qui a `overflow-hidden`) rétrécit et coupe son contenu. Mettre `*:shrink-0` sur le conteneur qui défile.
- **Leçon** : `sticky top-0` se cale sous le padding du conteneur qui défile. Pour coller au bord, décaler de ce padding (`-top-4 md:-top-6`). Ce qui colle sous l'en-tête lit `--page-header-height`, que `StickyPageHeader` publie déjà sans le padding.
- **Leçon** : le badge « n/N sections » de la liste et le sommaire lisent tous deux `profileOutline` : deux comptes séparés se contredisaient (5/6 contre 8 sections).
- **Suite (même jour)** : `/profile` est devenue une liste de cartes (`ProfileCard`, avec le menu `ProfileActionsMenu`). L'édition a sa page, `/profile/[id]`. La création passe par `/profile/new`, qui ouvre l'éditeur sur un brouillon enregistré seulement au premier « Enregistrer », puis `router.replace` vers `/profile/[id]`. Les anciens liens `/profile?id=` redirigent. `createProfile`, `ProfileList` et `ProfileWorkspace` sont supprimés.
- **Leçon** : `overflow-hidden` n'empêche pas un lien d'ancre, ou un focus, de faire défiler la boîte : le shell entier glissait sous le header. Le shell est en `overflow-clip`, qui ne crée pas de conteneur défilable.

### 2026-09-24 — US-116 contrat Pages employeurs (sprint-026)
- **Context** : le support a donné les scopes et le chemin. Contrat consigné dans sprint-026, et l'API ajoutée au catalogue `FT_APIS`.
- **Leçon** : chez France Travail, un 403 `insufficient_scope` sur tous les chemins peut venir d'un **second scope manquant**, même si le premier délivre bien un jeton : ce fut le cas pour La Bonne Boîte, ROME Substitutions, puis Pages employeurs. Demander au support la liste complète des scopes dès le premier 403.
- **Leçon** : ne pas se fier à l'exemple du support. Son champ `siret` était ignoré, et seul `what` (nom) + `where` (département), vérifié par le SIREN, retrouve une entreprise.
- **Leçon** : l'URL publique d'une page employeur est `recrute.francetravail.fr/page-employeur/<urlPath>`. `pro.francetravail.fr` est une application JavaScript qui répond 200 puis redirige vers `not-found` : un code HTTP ne prouve pas qu'une page d'application JavaScript existe.
- **Suite** : `UnsavedChangesGuard` (`components/layout/`) protège tout formulaire avec des modifications non enregistrées : une boîte de dialogue sur les liens internes, l'alerte du navigateur à la fermeture. Il est utilisé par l'éditeur de profil et par les critères de `/ma-recherche`. **Leçon** : un écouteur `click` sur `document`, en phase de capture, passe avant le `Link` de Next. Il couvre ainsi la sidebar et le fil d'Ariane sans toucher à ces composants. Les ancres de la même page (`#section`) doivent passer, sinon le sommaire devient inutilisable.

### 2026-09-24 — US-116 suite : page employeur sur la fiche entreprise (sprint-026)
- **Context** : Pages employeurs est lue pendant la relecture mensuelle des entreprises. La fiche affiche le lien vers `recrute.francetravail.fr`, et 29 % des entreprises en ont une.
- **Leçon** : pour une source ajoutée après coup à une relecture existante, une colonne `*_read_at` nulle rend les lignes dues dès l'activation, sans attendre l'échéance mensuelle.
- **Leçon** : l'Annuaire des entreprises annonce 7 appels/s mais répond 429 à 5 appels/s. Rester à 2 appels/s.

### 2026-09-24 — US-118 reste : appellations dans l'export RGPD (sprint-026)
- **Context** : `search_project_rome` et `profile_rome_competences` étaient purgées à la suppression du compte, mais absentes de l'export. Elles y sont désormais (`ownedSearchJobs`, `ownedProfileCompetences`).
- **Leçon** : chaque nouvelle table par utilisateur doit être ajoutée **à la purge et à l'export**. Le test « lignes résiduelles » de `privacy.service.test.ts` ne vérifie que la purge : un oubli dans l'export ne fait échouer aucun test.

## 2026-09-24 — US-131 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924143552]])
- **Context**: [[sprints/sprint-029#US-131]] · [[workflows/runs/analyze-design-dev-review-20260924143552/03-implement]]
- **Did**: Module `acquisition/` (POST /public/events, migration 0039, purge à 90 j), tunnel dans les métriques et le CSV, `FunnelCard` côté web, `trackToolEvent` et BFF `/api/events` côté landing. `shared/ip-hash.ts` et `lib/forwarded-for.ts` extraits.
- **Why**: E23 : mesurer le tunnel avant d'ajouter des outils.
- **Learned**: `app.module.test.ts` fige la liste des modules : tout nouveau module doit y être ajouté. `@cvforge/types` est lu depuis `dist` à l'exécution : lancer `pnpm --filter @cvforge/types build` après y avoir ajouté un export. Le test de démarrage tourne contre la base de dev locale : une purge journalise une erreur si cette base n'est pas migrée.
- **Open**: Découper la livraison en deux PR (API, puis web et landing).

### 2026-09-24 — Refonte UX des cartes d'offres et du panneau (/offres, /offres-du-jour)
- **Did** : cartes repensées (initiale de l'entreprise, méta avec icônes, actions « Garder » et « Pas pour moi » écrites en toutes lettres, plus aucune ✕). Score affiché en mots + % + jauge (`lib/match-score.ts`, `match-score.tsx`), avec le détail par critère dans le panneau (« Pourquoi cette offre ? »). Panneau à `max(45vw, 36rem)`. `SCORE_WEIGHTS` / `ScoreBreakdown` déplacés dans `@cvforge/types`. `scoreBreakdown` exposé par `/job-search/offers`.
- **Learned** : pour élargir un `Sheet`, il faut les mêmes modificateurs `data-[side=right]:` que la classe de base. Sans eux, `sm:max-w-sm` l'emporte en silence. Un match avec `score: 0` est une offre choisie à la main : ne jamais afficher « 0 % ».

## 2026-09-24 — US-132 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924145528]])
- **Context**: [[sprints/sprint-029#US-132]] · [[workflows/runs/analyze-design-dev-review-20260924145528/03-implement]]
- **Did**: Limitation par politique de route (`rate-limit.policies.ts`), `/public/events` couverte, `CLIENT_IP_HEADER` côté landing, ADR-022 amendée.
- **Why**: E23 ajoute des routes publiques ; le limiteur était câblé pour l'ATS.
- **Learned**: Faire de la politique la plus stricte le repli par défaut garde les anciens tests intacts, sans jamais ouvrir de passage libre. La balise `!override` de docker-compose.prod.yml empêche la lecture par PyYAML.
- **Open**: Vérification en production de `CF-Connecting-IP` et de l'origine réservée à Cloudflare.

### 2026-09-24 — Cartes « Entreprises qui recrutent » alignées sur les offres
- **Did** : `CompanyCard` repensée sur le modèle de `OfferCard` (initiale, secteur, méta avec icônes, badge « Fort potentiel » en succès, pied avec « Voir la fiche » et « Candidature spontanée », carte entière cliquable). `CompanyMark` extrait (`company-mark.tsx`) et `MetaList` / `MetaItem` exportés de `offer-meta.tsx` pour les deux listes.
- **Learned** : pour voir /entreprises en local, lancer `pnpm --filter @cvforge/api hiring-companies:refresh`, sinon la liste reste « Première lecture en cours ».

## 2026-09-24 — US-133 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924155415]])
- **Context**: [[sprints/sprint-029#US-133]] · [[workflows/runs/analyze-design-dev-review-20260924155415/03-implement]]
- **Did**: Intention de lead portée par le lien magique (migration 0042), `LeadCaptureService`, ATS migré, rapports ATS dans l'app.
- **Why**: Socle de conversion commun aux outils gratuits d'E23.
- **Learned**: Une autre session a livré la migration 0040 pendant que la 0039 était en cours : lire le journal Drizzle juste avant d'ajouter une migration, et choisir un `when` supérieur à tous ceux déjà présents. Dans le JSX, l'apostrophe typographique ’ évite `react/no-unescaped-entities`.
- **Open**: Deux PR (API, puis web).

### 2026-09-24 — Fiche entreprise repensée (/entreprises/[siret])
- **Did** : en-tête avec l'initiale, tuiles de chiffres clés (`company-key-figures.tsx`), engagements en tuiles avec icônes (`company-commitments.tsx`), colonne « Elle recrute » avec la candidature spontanée et son coût, page employeur, fiche d'identité avec les sources. `CompanyProfileView` reçoit le bouton par un prop `action`.
- **Learned** : pour voir une fiche complète en local, OPEN (38103128500574) a finances, page employeur, Egapro et bilan carbone ; YZEE (40799716200042) montre le cas « fiche pas encore lue ». La règle `react-hooks/purity` refuse `Date.now()` pendant le rendu, même en paramètre par défaut.

## 2026-09-24 — US-134 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924162332]])
- **Context**: [[sprints/sprint-029#US-134]] · [[workflows/runs/analyze-design-dev-review-20260924162332/03-implement]]
- **Did**: Codes d'erreur publics partagés entre l'API et la landing ; `locale` envoyée ; liens vers l'outil ATS dans le Hero et le CTA ; `ats-checker` découpé.
- **Why**: La version EN affichait les messages français de l'API.
- **Learned**: `HttpException` de Nest 11 garde `message` quand on lui passe un objet `{ code, message }` : les tests qui comparent le message restent valides. D'autres sessions modifient le dépôt en parallèle : relancer un test en échec hors périmètre avant de conclure.
- **Open**: none

### 2026-09-24 — Logos des entreprises, premier client Redis (ADR-025)
- **Did** : `entreprise.logo` d'Offres v2 gardé sur l'offre (`jobs.company_logo_url`, recopié depuis `job_listings.raw` par la migration 0042). Wikidata (P1616 → P154) lu par la passe des entreprises (`companies.logo_url`, `logo_read_at`). Proxy `GET /company-logos?src=` avec liste de préfixes autorisés, images matricielles de 512 Ko au plus, cache Redis 30 j (1 j pour un logo absent). Route web `/api/company-logos` ; `CompanyMark` affiche le logo, avec l'initiale en repli.
- **Learned** : le SPARQL de Wikidata (`query.wikidata.org`) a cessé de répondre pendant plusieurs minutes ; l'API du wiki (`haswbstatement` puis `wbgetentities`) répond en une seconde. Une recherche fait 300 caractères au plus, soit 15 SIREN. Les miniatures Commons n'existent qu'en largeurs standard : 120 px passe, 128 px donne 400. Sans `disconnect()` à l'arrêt, ioredis empêche un script CLI de se terminer quand Redis est injoignable. Un SIREN inconnu doit aussi enregistrer `logo_read_at`, sinon il revient chaque heure.
- **Open** : partager le logo entre les offres d'une même entreprise (`companyKey`), pour les sources qui n'en donnent pas.

## 2026-09-24 — US-135 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924164112]])
- **Context**: [[sprints/sprint-029#US-135]] · [[workflows/runs/analyze-design-dev-review-20260924164112/03-implement]]
- **Did**: lib/tools.ts, route app/[locale]/tools, réécriture /fr/outils, FreeToolGrid, section FreeTools, toolsStructuredData, sitemap, lien d'en-tête.
- **Why**: Même montage que la page ATS.
- **Learned**: Un build avec NEXT_DIST_DIR réécrit tsconfig.json et next-env.d.ts : les restaurer après coup.
- **Open**: none

## 2026-09-24 — US-136 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924173554]])
- **Context**: [[sprints/sprint-029#US-136]] · [[workflows/runs/analyze-design-dev-review-20260924173554/03-implement]]
- **Did**: Module keyword-match sans dépendance ; offer-structuring extrait ; relais BFF partagé ; toolFunnel ; EmailConsentForm.
- **Why**: Réutiliser sans dupliquer (proxy, formulaire, constructeur de PDF de test).
- **Learned**: Focaliser un panneau monté après un await : useEffect sur l'état, pas requestAnimationFrame. Modifier offerTerms change le score ATS, donc demande de monter la version du moteur.
- **Open**: Le checker ATS a probablement le même défaut de focus.

## 2026-09-24 — US-137 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924211657]])
- **Context**: [[sprints/sprint-030#US-137]] · [[workflows/runs/analyze-design-dev-review-20260924211657/03-implement]]
- **Did**:
  - module `job-market` ;
  - file `market_demand` lue par le radar ;
  - `SearchProjectLeadService` (profil vide créé au besoin) ;
  - `departments` déplacé dans `packages/types` ;
  - relais BFF GET ;
  - page landing avec combobox.
- **Why**: Aucun appel France Travail à la requête ; pré-remplir le projet sans ROMEO.
- **Learned**:
  - `drizzle-kit generate` régénère tout le schéma (instantanés périmés) : écrire la migration à la main et mettre `when` après la dernière entrée du journal, sinon elle est ignorée.
  - Nest applique le middleware une fois par route déclarée qui correspond : `x/{*splat}` et `x` comptaient deux fois `/x/lead`. Il faut marquer la requête.
  - Un onglet Chrome en arrière-plan ne joue pas `Reveal` : piloter la page en JS.
  - Ne pas lancer `pkill -f` avec un motif présent dans sa propre ligne de commande.
- **Open**: none

## 2026-09-24 — US-138 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924215644]])
- **Context**: [[sprints/sprint-030#US-138]] · [[workflows/runs/analyze-design-dev-review-20260924215644/03-implement]]
- **Did**: `public/market-pages` (hors rate limit) ; route ISR imbriquée sous `job-market` ; slugs à codes finaux ; sitemap asynchrone ; `JobMarketLeadCta` extrait.
- **Why**: L'ISR appelle l'API depuis le serveur de la landing, donc toujours depuis la même IP.
- **Learned**:
  - La landing lit les types dans `packages/types/dist` : reconstruire (`tsc -p`) après un ajout de type.
  - Un sitemap asynchrone casse les tests qui l'appelaient en synchrone : il faut simuler `fetch`.
  - `next dev` réécrit `next-env.d.ts` : le restaurer.
- **Open**: none

## 2026-09-24 — US-139 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924222645]])
- **Context**: [[sprints/sprint-030#US-139]] · [[workflows/runs/analyze-design-dev-review-20260924222645/03-implement]]
- **Did**: module `company-check` (Annuaire + Egapro à la demande, page employeur lue dans `companies`) ; `freeToolPolicies` ; `readSearchLeadActivations(tool)` ; `ToolLeadCta` générique ; contenu de l'outil dans `content/company-check/`.
- **Why**: Sans clé API ni appel France Travail à la requête ; ne pas grossir `fr.ts`/`en.ts`, déjà hors plafond.
- **Learned**:
  - L'Annuaire exige 3 caractères et `per_page` ≤ 25, ne trouve pas un SIRET (chercher le SIREN), et renvoie une fiche vide pour certains SIREN (123456789).
  - `tsx watch` de l'API de dev n'a pas rechargé un nouveau module : vérifier sur une instance à part (`PORT=3344`).
  - Les nouvelles routes Next demandent `next typegen` avant `tsc` (`PageProps`/`RouteContext`).
  - axe lancé pendant un `Reveal` donne de faux `color-contrast` : forcer l'opacité avant.
- **Open**: none

## 2026-09-24 — US-140 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260924232418]])
- **Context**: [[sprints/sprint-030#US-140]] · [[workflows/runs/analyze-design-dev-review-20260924232418/03-implement]]
- **Did**: `publishable` (migration 0044), `company-pages` (store + service + contrôleur), route ISR `employer-check/[company]` ; extraits `seo-pages`, `Breadcrumbs`, `PageLinks`, `CompanyLeadCta`.
- **Why**: Filtrer les personnes physiques ; ne pas dupliquer US-138.
- **Learned**:
  - `drizzle-kit generate` produit tout le schéma (snapshot périmé) : écrire la migration à la main et ajouter l'entrée du journal.
  - Un mock `fetch` qui renvoie la même `Response` à deux appels « passe » par accident (corps déjà lu) : rendre le mock sensible à l'URL.
  - Ni l'API ni la landing ne sont formatées par prettier à HEAD : ne formater que les nouveaux fichiers.
- **Open**: none

## 2026-09-25 — US-141 implement (stage 03 · [[workflows/runs/analyze-design-dev-review-20260925000215]])
- **Context**: [[sprints/sprint-030#US-141]] · [[workflows/runs/analyze-design-dev-review-20260925000215/03-implement]]
- **Did**: module `interview-questions` (un `chat` borné, `parseQuestions`, 503 `QUESTIONS_UNAVAILABLE`) ; politique `interview-questions` 3/h·10/j·300/j ; intention `interview` + `?candidature=recente` ; `readOfferLeadActivations(label)` ; `applications.service.ts` découpé (710 → 399 : `offer-input`, `offer-import`, `applications.kpi`) ; `OfferTextField` partagé.
- **Why**: Seule route E23 qui coûte un appel modèle : budget avant tout, et aucune erreur fournisseur ne remonte en 500.
- **Learned**:
  - Un dev server de l'utilisateur tourne souvent sur 3101/3333 : lancer le sien sur 3102/3344 avec `NEXT_DIST_DIR` à part, puis restaurer `tsconfig.json` et `next-env.d.ts`.
  - Couper le mail d'une instance de test : `SMTP_PROVIDER= SMTP_SERVER= …` vides (`loadEnvFile` n'écrase pas).
  - Racheter un lien sans email : remplacer `token_hash` par le sha256 d'un jeton connu, puis `GET /auth/passwordless/consume`.
  - Les 400 comptent dans le budget (middleware avant contrôleur) : pratique pour tester le 503 sans payer d'appels.
  - `pkill -f` a encore tué le shell : tuer par PID via `ss -ltnp`.
- **Open**: none

## 2026-09-25 — Panneau d'offre enrichi (ad hoc, demande utilisateur, hors US)
- **Context**: `/offres` et `/offres-du-jour` — panneau latéral trop pauvre, texte limité en largeur, 1 s+ à l'ouverture/fermeture.
- **Did**: API — `OfferDetails` lu à la lecture depuis `job_listings.raw` (aucune migration) : `sources/france-travail.details.ts`, `sources/boards/boards.details.ts`, `listing-details.ts` (fusion des annonces d'une même offre), `jobs.adverts.ts` (une requête par page au lieu d'un `findById` par offre). Web — `pushState` au lieu de `router.push`, `OfferCard` mémoïsée, `offer-details.tsx`, `offer-actions.tsx` extrait de `offer-sheet.tsx`, bouton « Postuler sur … » direct, mention de la source toujours visible, `max-w-prose` retiré.
- **Why**: `router.push` sur une page non cachée relançait le `page.tsx` serveur et l'API à chaque ouverture ; `raw` contenait déjà tout le payload FT/boards.
- **Learned**:
  - 1283/1873 offres FT sont relayées par un partenaire (`origineOffre.partenaires`) : c'est là que mène le « Postuler » de FT ; seules 255 ont `contact.urlPostulation`. Nommer le partenaire par `nom`, pas par l'hôte (aplitrak, xtramile = multidiffuseurs).
  - `contact.courriel`/`coordonnees*` FT contiennent souvent « Pour postuler, utiliser le lien suivant : … » : à filtrer.
  - Ne jamais lancer `prettier --write` sur un dossier : l'API n'est pas formatée à HEAD, ça touche des dizaines de fichiers.
- **Open**: les nouvelles infos ne sont pas encore utilisées par le scoring (salaire Lever, exigences FT).

## 2026-09-25 — Refonte de /credits (ad hoc, demande utilisateur, hors US)
- **Context**: `/credits` empilait solde, barème, packs, achats et un historique non paginé (tout le ledger renvoyé par `/credits/me`).
- **Did**: API — `GET /credits/me/history?page&pageSize&kind=spent|earned` (`listEntriesPageForUser`, `shared/pagination.ts`), type `CreditHistoryPage`. Web — `credits/layout.tsx` (solde en en-tête, onglets), `/credits` = packs + `CreditCosts`, `/credits/historique` = `CreditHistoryTable` + filtre en liens + pagination ; `TabNav` partagé avec `SearchNav` ; `OfferPagination`/`job-pagination` renommés `PagePagination`/`lib/pagination` ; `PurchasesTable` supprimé.
- **Why**: un achat payé figurait deux fois (commande + ligne `stripe_purchase`) ; les notes du ledger sont écrites pour le support (sans accents), seules la durée d'entretien, le pack et la raison d'un don sont montrés.
- **Learned**:
  - `api()` accepte `query` : inutile de construire la chaîne à la main.
  - L'API résout `@cvforge/types` via `dist` : rebâtir le paquet après y avoir ajouté une valeur (pas seulement un type).
  - Une nouvelle route typée (`PageProps<"/x">`) exige `next typegen` avant `tsc`.
  - Le fil d'Ariane nomme « Détail » tout sous-chemin inconnu : ajouter la route à `pathLabels`.
- **Then**: `/credits/me` ne renvoie plus que le solde (`CreditBalanceSummary`, `getBalanceSummaryForUser`) ; côté web `getCreditBalance` (React `cache`) partagé par le layout, le dashboard et l'en-tête des crédits. Les écrans admin gardent `getSummaryForUser` et tout le ledger.
- **Open**: `buildAdminUserDirectory` charge encore tout le ledger de chaque compte pour un solde, une date et un compteur.

## 2026-09-25 — E24 landing (sprint-031)
- Pages fonctionnalités = registre `apps/landing/lib/features.ts` + gabarit `components/feature-page*.tsx` + route d'une ligne via `lib/feature-route.tsx`. Slugs dans `lib/i18n.ts` (`featureSlugs`) et dupliqués dans `next.config.ts` (`FEATURE_SLUGS`, test d'accord).
- Captures : gros plans à 3x recadrés par union de cartes (`rounded-xl`), tailles réelles dans `lib/screenshot-sizes.json` ; JPEG des cartes de partage dans `assets/og/`.
- Ne pas builder la landing avec `NEXT_DIST_DIR` sans restaurer ensuite `tsconfig.json` et `next-env.d.ts`.

## 2026-09-25 — E25 onboarding guidé (sprint-032)
- État d'onboarding sur `auth_accounts` (migration 0045) + module API `src/onboarding/`. Côté web : `lib/onboarding.ts` (appels serveur), `lib/onboarding-steps.ts` (étapes, textes, `initialStep`), `components/onboarding/*` (wizard = formulaires existants réutilisés).
- La redirection se fait seulement dans `/login/success` (l'invitation y passe aussi) ; le tableau de bord ne redirige jamais, sinon « Terminer plus tard » boucle.
- Le projet de recherche exige un profil enregistré : le wizard enregistre le profil en quittant Identité et Parcours, les critères en quittant Lieu (ROMEO tourne à ce moment).
- `@cvforge/types` : après avoir ajouté un type, lancer `pnpm --filter @cvforge/types build`, sinon le typecheck web ne le voit pas.
- Test navigateur sans e-mail : insérer une ligne dans `auth_magic_links` (sha256 du jeton) puis appeler `/auth/passwordless/consume` ; Playwright de `apps/landing` avec l'exécutable `~/.cache/ms-playwright/chromium-1234`.

## 2026-09-25 — E26 cockpit de pilotage (sprint-033)
- Coûts IA : `ai_usage_events` (migration 0046) alimentée par `OpenRouterService`, la voix et la transcription via un `AiUsageRecorder` injecté (ai/ai-usage.ts). Tout nouvel appel IA passe `feature` dans `ChatOptions` (union `AiFeature` de `@cvforge/types`), sinon il compte en « other ».
- OpenRouter renvoie toujours `usage.cost` (USD), y compris dans le dernier chunk d'un stream : rien à activer.
- Recherches des outils gratuits : `tool_queries` (compteur par jour, sans IP), écrit par `ToolQueriesService` exporté du module acquisition ; purge 365 j.
- API cockpit : `src/metrics/<domaine>/` (store SQL + service), `shared/metrics-window.ts` (période, précédente, `readKpi`), `shared/time-series.ts` (buckets UTC, zero-fill), `CockpitService` câble le tout. Économie unitaire : `ai-costs/unit-economics.ts` (`BILLED_FEATURES`).
- Web : `app/(app)/admin/metrics/*` + `components/admin/metrics/*` + `lib/admin-metrics/*` ; les sections serveur passent le bucket à `MetricsTrendCard` (client) au lieu d'une fonction de formatage.

## 2026-09-25 — Entretien vocal via OpenAI Realtime (ADR-026, US-160)
- La voix d'entretien ne passe plus par OpenRouter : WebRTC direct navigateur ↔ OpenAI. Nest fait la poignée de main SDP (`POST /interviews/sessions/:id/realtime` → `POST /v1/realtime/calls` en multipart, call id dans `Location`) puis rejoint l'appel en sideband (WebSocket natif de Node, clé en en-tête).
- `InterviewCall` (api/src/interview/interview-call.ts) : ordonne les items (la transcription du candidat arrive souvent après la réponse), `session.update` de l'agenda après chaque `response.done`, raccroche sur `output_audio_buffer.stopped` après l'au revoir (secours 15 s) ou à durée + 90 s.
- `/finish` appelle `endCall` avant le scoring pour sauver les derniers mots. `getSession` renvoie `concluded` : le studio le lit quand l'appel se coupe (au revoir vs coupure réseau).
- Coût : `openai-realtime.pricing.ts` (tarifs en dur, les prix cachés du mini sont estimés — à recaler sur facture) → cockpit `interview_voice`.
- Nouveau secret `OPENAI_API_KEY` (deploy.yml, Terraform `openai_api_key`, set-secrets.sh, boot test). Les variables `INTERVIEW_VOICE_*`/`INTERVIEW_STT_*` sont supprimées.
