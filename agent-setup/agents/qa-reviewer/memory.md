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
