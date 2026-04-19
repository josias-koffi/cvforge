# Upgrade Summary

- Timestamp: `20260419-035118`
- Reason: upgrade-project migration from older generated scaffold to current orchestrated format

## Replaced

- Source path: `AGENTS.md`
  Backup path: `.project/upgrades/20260419-035118/AGENTS.md`
  Reason: generated entry doc referenced old spec, agent, sprint, and workflow paths
- Source path: `.claude/CLAUDE.md`
  Backup path: `.project/upgrades/20260419-035118/CLAUDE.md`
  Reason: generated Claude entry doc referenced old layout and command semantics
- Source path: `README.md`
  Backup path: `.project/upgrades/20260419-035118/README.md`
  Reason: generated init block was outdated and pointed to old managed paths
- Source path: `.project/state.json`
  Backup path: `.project/upgrades/20260419-035118/state.json`
  Reason: state file needed orchestration keys while preserving existing project values
- Source path: `agent-setup/workflows/analyze-design-dev-review.md`
  Backup path: `.project/upgrades/20260419-035118/agent-setup/workflows/analyze-design-dev-review.md`
  Reason: replace old prose workflow with explicit staged orchestration format
- Source path: `agent-setup/workflows/bug-triage.md`
  Backup path: `.project/upgrades/20260419-035118/agent-setup/workflows/bug-triage.md`
  Reason: replace old prose workflow with explicit staged orchestration format
- Source path: `agent-setup/workflows/release.md`
  Backup path: `.project/upgrades/20260419-035118/agent-setup/workflows/release.md`
  Reason: replace old prose workflow with explicit staged orchestration format
- Source path: `agent-setup/workflows/spike-research.md`
  Backup path: `.project/upgrades/20260419-035118/agent-setup/workflows/spike-research.md`
  Reason: replace old prose workflow with explicit staged orchestration format
