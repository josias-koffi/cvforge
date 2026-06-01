# Upgrade Summary — 2026-06-01

Triggered by: `/upgrade-project`
Framework mode: legacy (no vault)

## Actions

| Action | Source Path | Backup Path | Reason |
|--------|------------|-------------|--------|
| replace | AGENTS.md | .project/upgrades/20260601/AGENTS.md | Generated, adds active-refactoring rule + MCP docs |
| replace | .claude/CLAUDE.md | .project/upgrades/20260601/.claude/CLAUDE.md | Generated, adds path-resolution section |
| replace | agent-setup/agents/designer/agent.md | .project/upgrades/20260601/agent-setup/agents/designer/agent.md | v1.10.0 upgrade — adds Design workflow section |
| replace | agent-setup/agents/developer/agent.md | .project/upgrades/20260601/agent-setup/agents/developer/agent.md | Adds Active Refactoring block |
| replace | agent-setup/agents/qa-reviewer/agent.md | .project/upgrades/20260601/agent-setup/agents/qa-reviewer/agent.md | Adds Active Refactoring block |
| replace | agent-setup/spec/engineering-standards.md | .project/upgrades/20260601/agent-setup/spec/engineering-standards.md | Framework template refresh |
| replace | agent-setup/workflows/analyze-design-dev-review.md | .project/upgrades/20260601/agent-setup/workflows/analyze-design-dev-review.md | Adds frontmatter, wikilinks, active-refactoring QA check |
| replace | agent-setup/workflows/bug-triage.md | .project/upgrades/20260601/agent-setup/workflows/bug-triage.md | Format upgrade |
| replace | agent-setup/workflows/release.md | .project/upgrades/20260601/agent-setup/workflows/release.md | Format upgrade |
| replace | agent-setup/workflows/spike-research.md | .project/upgrades/20260601/agent-setup/workflows/spike-research.md | Format upgrade |
| replace | agent-setup/skills/create-pr.md | .project/upgrades/20260601/agent-setup/skills/create-pr.md | Framework template refresh |
| replace | agent-setup/skills/dependency-audit.md | .project/upgrades/20260601/agent-setup/skills/dependency-audit.md | Framework template refresh |
| replace | agent-setup/skills/lint-and-format.md | .project/upgrades/20260601/agent-setup/skills/lint-and-format.md | Framework template refresh |
| replace | agent-setup/skills/run-tests.md | .project/upgrades/20260601/agent-setup/skills/run-tests.md | Framework template refresh |
| patch | .project/state.json | .project/upgrades/20260601/.project/state.json | Added vault_path and vault_project_path keys |
| create | .mcp.json | — | New file, MCP server config |
| create | .codex/config.toml | — | New file, Codex CLI MCP config |
| create | agent-setup/skills/push-to-github.md | — | New framework skill |
| create | PRODUCT.md | — | UI project stub |
| create | DESIGN.md | — | UI project stub |
