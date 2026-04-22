<!-- generated-by: /init-project -->

# Skill: git-push-safe

## Objective

Commit and push only after quality gates pass, using Conventional Commits.

## Preconditions

- [ ] Lint passed (`lint-and-format`)
- [ ] Tests passed (`run-tests`)
- [ ] Coverage ≥ threshold in spec
- [ ] Commit message matches `^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\(.+\))?(!)?: .{10,}$`

## Procedure

1. `git status` — confirm staged files are task-related only.
2. `git diff --stat HEAD`.
3. Run lint (blocking on failure).
4. Run tests (blocking on failure).
5. `git add <files>` (preferably interactive).
6. `git commit -m "<type>(<scope>): <description>"`.
7. `git push origin <branch>`.

## Checks

- [ ] Lint exit 0
- [ ] Tests exit 0
- [ ] Coverage ≥ threshold
- [ ] Commit message valid

## On failure

Report exact failure, do not commit. Return to developer.

## Output

Commit SHA + push confirmation, or error detail.
