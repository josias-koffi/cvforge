<!-- generated-by: /init-project -->

# Workflow: Analyze → Design → Dev → Review

## Trigger

A task moves to "In Progress" in the active sprint file.

## Steps

1. **Analyze** (`product-owner`)
   - Read task. Verify acceptance criteria complete (≥ 2 verifiable items).
   - Output: confirmation note in sprint file.
   - Pass: criteria confirmed.

2. **Design** (`designer`) — skip if non-UI
   - Produce mockup/journey in `.project/designs/<task-id>.md`.
   - Verify WCAG AA compliance upfront.
   - Pass: developer acknowledges design.

3. **Implement** (`developer`)
   - Read `spec/engineering-standards.md`. Honour clean architecture.
   - Write code + tests (new code coverage ≥ 90%).
   - Skills: `lint-and-format`, `run-tests`.
   - Pass: lint green, tests green, coverage ≥ threshold.

4. **Commit & PR** (`developer`)
   - Skills: `git-push-safe`, `create-pr`.
   - Pass: conventional commit format, PR ≤ 400 lines, PR description complete.

5. **Review** (`qa-reviewer`)
   - Run tests, check coverage, run dependency audit, check accessibility (if UI).
   - Verify every acceptance criterion line by line.
   - Verdict: ✅ (all blocking rules pass) or ❌ (any blocking rule fails — back to step 3).
   - Advisory findings → warning comments, do not block.

## Rollback point

Step 3 on ❌ from step 5.

## State logs

- `last_workflow_run`: "analyze-design-dev-review"
- `last_task_completed`: "<task-id>"
