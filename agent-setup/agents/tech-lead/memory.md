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
