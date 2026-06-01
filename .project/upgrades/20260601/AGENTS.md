<!-- generated-by: /init-project -->
<!-- vars: PROJECT_NAME, STACK_DETAILS, ARCHITECTURE_STYLE, LINT_CMD, FORMAT_CMD, TEST_CMD, BUILD_CMD, DEV_CMD -->
# AGENTS.md — cvforge

This repository uses a multi-agent workflow for Codex CLI sessions.

## Project
- Name: cvforge
- Vision: `.project/vision.md` (source of truth, never auto-edit)
- State: `.project/state.json`
- Engineering spec: `agent-setup/spec/engineering-standards.md`
- Workflow artifacts: `.project/workflows/`

## Stack
- node + Next.js + NestJS + PostgreSQL + Redis + Docker + Turborepo + pnpm workspaces (source: vision §2)
- Architecture: monorepo (source: vision §2)

## Commands
- Lint: `pnpm lint`
- Format: `pnpm format`
- Test: `pnpm test`
- Build: `pnpm build`
- Dev: `pnpm dev`

## Required reading before substantial work
1. `AGENTS.md`
2. `.claude/CLAUDE.md`
3. `agent-setup/agents/<own-role>/memory.md`
4. `agent-setup/spec/engineering-standards.md`
5. the relevant sprint file when the task is sprint-based
6. `.project/workflows/<run-id>/` artifacts when the task is workflow-orchestrated

## Agent roles
- Product Owner: `agent-setup/agents/product-owner/`
- Developer: `agent-setup/agents/developer/`
- Designer: `agent-setup/agents/designer/`
- Analyst: `agent-setup/agents/analyst/`
- QA Reviewer: `agent-setup/agents/qa-reviewer/`
- Tech Lead: `agent-setup/agents/tech-lead/`
- Specialized roles: `agent-setup/agents/specialized/`

## Hard rules
- Never modify `.project/vision.md`
- Never check a sprint task box unless every acceptance criterion is verified
- Never add features absent from `.project/vision.md` without explicit user approval
- Never introduce a new framework without an ADR in `.project/decisions/`

## Memory protocol
After completing a task or workflow stage, append a dated entry to `agent-setup/agents/<own-role>/memory.md`.

## Project commands
```text
$init-project [optional-vision-file.md]
$sprint <sprint-number> [task-id]
$run-agent <agent> <task text>
$run-workflow <workflow> <task-id|task-text>
$upgrade-project
```

## Command semantics
- `$sprint` = sprint-scoped workflow orchestration using the workflow declared by each sprint task
- `$run-agent` = ad hoc single-agent execution outside sprint files
- `$run-workflow` = direct staged multi-agent orchestration with persisted handoff artifacts under `.project/workflows/`
- `$upgrade-project` = safe preview-first migration for older initialized projects
