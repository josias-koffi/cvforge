<!-- generated-by: /init-project -->
# Workflow: Release

## Mode
orchestrated

## Stage 1 - Freeze
Agent: tech-lead
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
Agent: qa-reviewer
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
Agent: tech-lead
Inputs:
- `.project/workflows/<run-id>/02-regression.md`
Outputs:
- `.project/workflows/<run-id>/03-audit.md`
Pass:
- Dependency and operational risks are explicit
OnFailure:
- Stop and require remediation before deploy

## Stage 4 - Deploy
Agent: developer
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
Agent: product-owner
Inputs:
- `.project/workflows/<run-id>/04-deploy.md`
Outputs:
- `.project/workflows/<run-id>/final-summary.md`
Pass:
- Release note and user-facing outcome are explicit
OnFailure:
- Stop and request clarification from the user
