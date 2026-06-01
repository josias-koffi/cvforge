<!-- generated-by: /init-project -->
# Workflow: Analyze -> Design -> Dev -> Review

## Mode
orchestrated

## Stage 1 - Analyze
Agent: product-owner
Inputs:
- Task record from sprint or ad hoc request
- `.project/vision.md`
- Acceptance criteria
Outputs:
- `.project/workflows/<run-id>/01-analyze.md`
Pass:
- Scope is clear
- Acceptance criteria are testable
- Missing product questions are listed
OnFailure:
- Stop and report unresolved scope gaps

## Stage 2 - Design
Agent: designer
Inputs:
- `.project/workflows/<run-id>/01-analyze.md`
- UI or UX constraints from the vision
Outputs:
- `.project/workflows/<run-id>/02-design.md`
Pass:
- Proposed design fits the analyzed scope
- UX risks or non-UI skip decision are explicit
OnFailure:
- Stop and return to Stage 1 if the problem framing changed

## Stage 3 - Implement
Agent: developer
Inputs:
- `.project/workflows/<run-id>/01-analyze.md`
- `.project/workflows/<run-id>/02-design.md`
- `agent-setup/spec/engineering-standards.md`
Outputs:
- `.project/workflows/<run-id>/03-implement.md`
Pass:
- Code changes are described
- Tests and quality gates are run or explicitly blocked
- Coverage impact is stated
OnFailure:
- Stop and document the blocking engineering issue

## Stage 4 - Review
Agent: qa-reviewer
Inputs:
- `.project/workflows/<run-id>/03-implement.md`
- Acceptance criteria
Outputs:
- `.project/workflows/<run-id>/04-review.md`
Pass:
- Every acceptance criterion is verified or rejected explicitly
- Blocking defects are listed separately from advisories
OnFailure:
- Stop and send the task back to implementation with the blocking findings

## Finalization
Agent: tech-lead
Inputs:
- `.project/workflows/<run-id>/04-review.md`
Outputs:
- `.project/workflows/<run-id>/final-summary.md`
Pass:
- Final verdict is unambiguous
- Next action is explicit
OnFailure:
- Stop and request clarification from the user
