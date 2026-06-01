<!-- generated-by: /init-project -->
<!-- vars: PROJECT_NAME, STACK_DETAILS, ARCHITECTURE_STYLE, LINT_CMD, FORMAT_CMD, TEST_CMD, BUILD_CMD, DEV_CMD, VAULT_PROJECT_PATH, SPEC_PATH, AGENTS_DIR, WORKFLOWS_DEF_DIR, WORKFLOWS_RUNS_DIR, SPRINTS_DIR, VISION_PATH -->
# CLAUDE.md — cvforge

> Auto-loaded by Claude Code every session. Keep this file short. Long content goes in spec/, agents/<role>/, or sprints/.

Codex CLI sessions should also read `AGENTS.md` at the repo root.

## Project
- Name: cvforge
- Vision: `.project/vision.md` (source of truth, never auto-edit)
- State: `.project/state.json`
- Engineering spec: `agent-setup/spec/engineering-standards.md` (read before coding)
- Workflow runs: `.project/workflows/`

## Stack (detected)
- Next.js + NestJS + PostgreSQL + Redis + Docker + Turborepo + pnpm workspaces
- Architecture: monorepo

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

## Path resolution
Read `.project/state.json` for `vault_project_path`. If set, all agent/workflow/sprint paths are under the vault. Skills resolve paths automatically.

## Memory protocol
Before substantial work, every agent must read:
1. `.claude/CLAUDE.md`
2. `agent-setup/agents/<own-role>/memory.md`
3. `agent-setup/spec/engineering-standards.md`
4. the relevant sprint file: `.project/sprints/sprint-NNN.md`
5. `.project/workflows/<run-id>/` artifacts when workflow-orchestrated

After completing a task or workflow stage, append a dated entry to that agent's `memory.md`.

## Hard rules
- Never modify `.project/vision.md`
- Never check a sprint task box unless every acceptance criterion is verified
- Never add features absent from the vision without explicit user approval
- Never introduce a new framework without an ADR in the decisions folder
- **Active refactoring is part of every task** — on every touched file, fix obvious duplication, dead code, and size violations (see `agent-setup/spec/engineering-standards.md` §9). On existing/active projects this is in-scope of the current task, not a separate sprint. Untouched files stay untouched.

## MCP servers
Two config files shipped, one per runtime — both versioned at repo root:
- `.mcp.json` — Claude Code
- `.codex/config.toml` — Codex CLI (project-local; trusted projects only)

Keep them in sync when adding a server.

**Active by default (installed by `bootstrap.sh`):**
- `context7` — up-to-date library/framework documentation. Use before adopting a new API or upgrading a dependency. Optional `CONTEXT7_API_KEY` env var for higher rate limits (https://context7.com/dashboard).
- `cve-mcp` (`mukul975/cve-mcp-server`) — 27 security tools (OSV.dev, GitHub Security Advisories, CISA KEV, MITRE ATT&CK). Vendored at `$HOME/.agent-setup/vendor/cve-mcp-server` with its own venv. Optional API keys via env: `NVD_API_KEY`, `GITHUB_TOKEN`, `ABUSEIPDB_KEY`, `GREYNOISE_API_KEY`, `SHODAN_KEY` (works without).

To skip the local CVE MCP install: `bash bootstrap.sh --no-mcp`. If skipped, remove the `cve-mcp` entries from `.mcp.json` and `.codex/config.toml`.

## Project commands
```text
/init-project [optional-vision-file.md] [vault_path=/abs/path]
/migrate [vault_path=/abs/path]
/sprint <sprint-number> [task-id]
/run-agent <agent> <task text>
/run-workflow <workflow> <task-id|task-text>
/upgrade-project
```

## Command semantics
- `/init-project` = initialize project; use `vault_path=` to enable Obsidian vault mode
- `/migrate` = migrate existing .project/ and agent-setup/ to an Obsidian vault
- `/sprint` = sprint-scoped workflow orchestration
- `/run-agent` = ad hoc single-agent execution outside sprint files
- `/run-workflow` = direct staged multi-agent orchestration
- `/upgrade-project` = safe preview-first migration for older initialized projects
