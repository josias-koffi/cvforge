<!-- generated-by: /init-project -->

# Workflow: Release

## Trigger

Sprint DoD fully met and release approved.

## Steps

1. **Freeze** (`tech-lead`) — confirm sprint DoD ticks. Pass: all tasks ✅.
2. **Regression** (`qa-reviewer`) — skill `run-tests` full suite. Pass: 100% green.
3. **Dep audit** (`tech-lead`) — skill `dependency-audit`. Pass: 0 critical, 0 high, no licence violations.
4. **Tag & changelog** (`developer`) — semver tag, generate changelog from conventional commits.
5. **Deploy** (`developer`) — run deploy command from `.claude/CLAUDE.md`.
6. **Release note** (`product-owner`) — write `.project/releases/vX.Y.Z.md` summarising delivered value per epic.

## Rollback

Step 2 if regression fails post-deploy; revert tag.

## State logs

- `releases`: append `{version, date}`
