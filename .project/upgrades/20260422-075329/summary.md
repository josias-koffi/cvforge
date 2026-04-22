# Upgrade Summary — 20260422-075329

- `replace`: `.project/state.json`
  backup: `.project/upgrades/20260422-075329/state.json.bak`
  reason: preserved the live state and workflow history while adding the missing managed `repos` orchestration key.
- `replace`: `README.md` generated block only
  backup: `.project/upgrades/20260422-075329/README.md.bak`
  reason: refreshed the managed README block to match the current framework template formatting without touching user-authored content outside the block.
- `skip`: `AGENTS.md`
  reason: already matched the current framework render.
- `skip`: `.claude/CLAUDE.md`
  reason: already matched the current framework render.
- `skip`: `agent-setup/workflows/analyze-design-dev-review.md`
  reason: already matched the current framework render.
- `skip`: `agent-setup/workflows/bug-triage.md`
  reason: already matched the current framework render.
- `skip`: `agent-setup/workflows/release.md`
  reason: already matched the current framework render.
- `skip`: `agent-setup/workflows/spike-research.md`
  reason: already matched the current framework render.
- `sync`: `agent-setup/skills/*.md` -> `.claude/skills/*/SKILL.md`
  reason: keep runtime Claude project-local skill overrides current.
- `blocked`: `agent-setup/skills/*.md` -> `.codex/skills/*/SKILL.md`
  reason: repo path `.codex` is a read-only mounted file in this environment, so it cannot be replaced with the required directory layout from within the workspace.
