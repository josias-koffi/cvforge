<!-- generated-by: /init-project -->
<!-- vars: PROJECT_NAME, STACK_DETAILS, ARCHITECTURE_STYLE, LINT_CMD, FORMAT_CMD, TEST_CMD, BUILD_CMD, DEV_CMD -->
# CLAUDE.md — cvforge

> Auto-loaded by Claude Code every session. Keep this file short. Long content goes in spec/, agent-setup/agents/<role>/, or .project/.

Codex CLI sessions should also read `AGENTS.md` at the repo root.

## Project
- Name: cvforge
- Vision: `.project/vision.md` (source of truth, never auto-edit)
- State: `.project/state.json`
- Engineering spec: `agent-setup/spec/engineering-standards.md` (read before coding)
- Workflow artifacts: `.project/workflows/`

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
- Product Owner -> `agent-setup/agents/product-owner/agent.md` + `memory.md`
- Developer -> `agent-setup/agents/developer/agent.md` + `memory.md`
- Designer -> `agent-setup/agents/designer/agent.md` + `memory.md`
- Analyst -> `agent-setup/agents/analyst/agent.md` + `memory.md`
- QA Reviewer -> `agent-setup/agents/qa-reviewer/agent.md` + `memory.md`
- Tech Lead -> `agent-setup/agents/tech-lead/agent.md` + `memory.md`
- Specialised -> `agent-setup/agents/specialized/`

## Memory protocol
Before substantial work, every agent must read:
1. `.claude/CLAUDE.md`
2. `agent-setup/agents/<own-role>/memory.md`
3. `agent-setup/spec/engineering-standards.md`
4. the relevant sprint file when the task is sprint-based
5. `.project/workflows/<run-id>/` artifacts when the task is workflow-orchestrated

After completing a task or workflow stage, append a dated entry to that agent's `memory.md`.

## Hard rules
- Never modify `.project/vision.md`
- Never check a sprint task box unless every acceptance criterion is verified
- Never add features absent from `.project/vision.md` without explicit user approval
- Never introduce a new framework without an ADR in `.project/decisions/`

## Project commands
```text
/init-project [optional-vision-file.md]
/sprint <sprint-number> [task-id]
/run-agent <agent> <task text>
/run-workflow <workflow> <task-id|task-text>
/upgrade-project
```

## Command semantics
- `/sprint` = sprint-scoped workflow orchestration using the workflow declared by each sprint task
- `/run-agent` = ad hoc single-agent execution outside sprint files
- `/run-workflow` = direct staged multi-agent orchestration with persisted handoff artifacts under `.project/workflows/`
- `/upgrade-project` = safe preview-first migration for older initialized projects
