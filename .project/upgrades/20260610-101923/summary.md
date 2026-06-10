# Upgrade Summary

Date: 2026-06-10
Mode: legacy

## Replaced

| Source path | Backup path | Reason |
|---|---|---|
| `agent-setup/spec/engineering-standards.md` | `agent-setup/spec/engineering-standards.md` | Correct detected coverage tool from Jest to Vitest coverage-v8 and refresh generated date. |
| `agent-setup/skills/dependency-audit.md` | `agent-setup/skills/dependency-audit.md` | Use the project's blocking high-severity audit command. |
| `agent-setup/skills/run-tests.md` | `agent-setup/skills/run-tests.md` | Correct the generated coverage parser guidance from Jest to Vitest coverage-v8. |
| `.claude/skills/dependency-audit/SKILL.md` | `.claude/skills/dependency-audit/SKILL.md` | Synchronize the refreshed project skill into the Claude runtime. |
| `.claude/skills/run-tests/SKILL.md` | `.claude/skills/run-tests/SKILL.md` | Synchronize the refreshed project skill into the Claude runtime. |
| `.codex/skills/dependency-audit/SKILL.md` | `.codex/skills/dependency-audit/SKILL.md` | Synchronize the refreshed project skill into the Codex runtime. |
| `.codex/skills/run-tests/SKILL.md` | `.codex/skills/run-tests/SKILL.md` | Synchronize the refreshed project skill into the Codex runtime. |

Backup paths in the table are relative to this upgrade directory.

## Skipped

- Existing workflow run-history links were preserved.
- `PRODUCT.md` and `DESIGN.md` were preserved as user-authored files.
- `.project/state.json` already contained all required orchestration and vault keys.
- All other managed files matched the current framework render.

## Optional Install Failures

- `npx --yes skills add pbakaus/impeccable` failed with npm `E401`.
- `npx --yes skills add anthropics/claude-code#plugins/frontend-design` failed with npm `E401`.

The npm registry authentication token must be corrected before retrying these installs.

## Install Retry

Retried on 2026-06-10 after npm authentication was corrected:

- Impeccable installed successfully under `.agents/skills/impeccable`.
- `skills-lock.json` was updated by the installer.
- The historical `frontend-design` command still failed because
  `plugins/frontend-design` is not a branch in `anthropics/claude-code`.
