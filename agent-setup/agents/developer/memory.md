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
