<!-- generated-by: /init-project -->
---
tags: [workflow/definition, workflow/release]
parent: "[[_README]]"
---
# Workflow: Release

## Mode
orchestrated

## Used by
<!-- Auto-appended by `sprint` / `run-workflow` when this workflow is triggered. -->
<!-- - [[sprints/sprint-NNN#US-XXX]] — YYYY-MM-DD → [[workflows/runs/<run-id>]] -->

## Stage 1 - Freeze
Agent: [[agents/tech-lead/agent|tech-lead]]
Inputs:
- Sprint completion status
- Release scope
Outputs:
- `.project/workflows/<run-id>/01-freeze.md`
Pass:
- Release scope is frozen
- Blocking gaps are listed
OnFailure:
- Stop and return to sprint execution

## Stage 2 - Regression
Agent: [[agents/qa-reviewer/agent|qa-reviewer]]
Inputs:
- `.project/workflows/<run-id>/01-freeze.md`
- Test plan and quality gates
Outputs:
- `.project/workflows/<run-id>/02-regression.md`
Pass:
- Full regression verdict is explicit
OnFailure:
- Stop and return the release candidate to engineering

## Stage 3 - Audit
Agent: [[agents/tech-lead/agent|tech-lead]]
Inputs:
- `.project/workflows/<run-id>/02-regression.md`
Outputs:
- `.project/workflows/<run-id>/03-audit.md`
Pass:
- Dependency and operational risks are explicit
OnFailure:
- Stop and require remediation before deploy

## Stage 4 - Deploy
Agent: [[agents/developer/agent|developer]]
Inputs:
- `.project/workflows/<run-id>/03-audit.md`
Outputs:
- `.project/workflows/<run-id>/04-deploy.md`
Pass:
- Deployment result is explicit
- Rollback status is explicit if deployment failed
OnFailure:
- Stop and record rollback actions

## Finalization
Agent: [[agents/product-owner/agent|product-owner]]
Inputs:
- `.project/workflows/<run-id>/04-deploy.md`
Outputs:
- `.project/workflows/<run-id>/final-summary.md`
Pass:
- Release note and user-facing outcome are explicit
OnFailure:
- Stop and request clarification from the user
