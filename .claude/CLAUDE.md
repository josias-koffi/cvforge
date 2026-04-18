<!-- generated-by: /init-project -->
<!-- vars: PROJECT_NAME, STACK_DETAILS, ARCHITECTURE_STYLE, LINT_CMD, FORMAT_CMD, TEST_CMD, BUILD_CMD, DEV_CMD -->

# CLAUDE.md — cvforge

> Auto-loaded by Claude Code every session. Keep this file short. Long content goes in spec/, agents/<role>/, or .project/.

Codex CLI sessions should also read `AGENTS.md` at the repo root.

## Project

- Name: cvforge
- Vision: `.project/vision.md` (source of truth, never auto-edit)
- State: `.project/state.json`
- Engineering spec: `spec/engineering-standards.md` (read before coding)

## Stack (detected)

- node + Next.js + NestJS + PostgreSQL + Redis + Docker + Turborepo + pnpm workspaces (source: vision §2)
- Architecture: monorepo (source: vision §2)

## Commands

- Lint: `pnpm lint`
- Format: `pnpm format`
- Test: `pnpm test`
- Build: `pnpm build`
- Dev: `pnpm dev`

## Agents — one per role, with own memory

- Product Owner → `agents/product-owner/agent.md` + `memory.md`
- Developer → `agents/developer/agent.md` + `memory.md`
- Designer → `agents/designer/agent.md` + `memory.md`
- Analyst → `agents/analyst/agent.md` + `memory.md`
- QA Reviewer → `agents/qa-reviewer/agent.md` + `memory.md`
- Tech Lead → `agents/tech-lead/agent.md` + `memory.md`
- Specialised (project-specific) → `agents/specialized/`

## Memory protocol (strict)

Before any substantial action, every agent MUST:

1. Read `.claude/CLAUDE.md` (this file)
2. Read `agents/<own-role>/memory.md`
3. Read `spec/engineering-standards.md`
4. Read the relevant sprint file under `sprints/`

After completing a task, every agent MUST append a dated entry to its own `memory.md` covering: what was done, why, what it learned, and open questions.

## Enforcement policy

- **Blocking** (refuse commit/merge): failing tests, coverage below threshold in `spec/engineering-standards.md`, secrets detected, critical dependency vulnerabilities, missing ADR for stack changes.
- **Advisory** (warn but allow): style/naming nits, documentation gaps, non-critical TODOs.

See `spec/engineering-standards.md` for full rules.

## Hard rules

- Never modify `.project/vision.md`
- Never check a sprint task box unless every acceptance criterion is verified
- Never add features absent from `.project/vision.md` without explicit user approval
- Never introduce a new framework without an ADR in `.project/decisions/`

## Bootstrap a project

```
/init-project [optional-vision-file.md]
```

## Run a sprint

```
/sprint <sprint-number> <agent> <workflow> <task-id|all>
/sprint 001 developer analyze-design-dev-review US-001
```
