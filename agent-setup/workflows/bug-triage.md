<!-- generated-by: /init-project -->

# Workflow: Bug Triage

## Trigger

Defect reported during sprint.

## Steps

1. **Reproduce** (`developer`) — document steps + expected/actual. Pass: consistently reproducible OR "cannot reproduce" marked.
2. **Categorise** (`tech-lead`) — severity P0/P1/P2, root cause area. Pass: severity assigned.
3. **Prioritise** (`product-owner`) — add to backlog with severity, decide sprint inclusion. Pass: backlog entry exists.
4. **Assign** (`product-owner`) — if P0/P1 add to current sprint, acceptance criteria = "bug fixed + regression test added".

## Rollback

Step 1 if root cause changes after failed fix.

## State logs

- `bugs_triaged`: increment
