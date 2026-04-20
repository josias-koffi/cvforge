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
