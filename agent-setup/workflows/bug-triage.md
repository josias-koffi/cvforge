<!-- generated-by: /init-project -->
---
tags: [workflow/definition, workflow/bug-triage]
parent: "[[_README]]"
---
# Workflow: Bug Triage

## Mode
orchestrated

## Used by
<!-- Auto-appended by `sprint` / `run-workflow` when this workflow is triggered. -->
<!-- - [[sprints/sprint-NNN#US-XXX]] — YYYY-MM-DD → [[workflows/runs/<run-id>]] -->

## Stage 1 - Reproduce
Agent: [[agents/developer/agent|developer]]
Inputs:
- Bug report
- Relevant runtime context
Outputs:
- `.project/workflows/<run-id>/01-reproduce.md`
Pass:
- Reproduction steps are stable or the inability to reproduce is explicit
OnFailure:
- Stop and ask for missing reproduction details

## Stage 2 - Categorize
Agent: [[agents/tech-lead/agent|tech-lead]]
Inputs:
- `.project/workflows/<run-id>/01-reproduce.md`
Outputs:
- `.project/workflows/<run-id>/02-categorize.md`
Pass:
- Severity and likely root-cause area are assigned
OnFailure:
- Stop and request a narrower technical scope

## Stage 3 - Prioritize
Agent: [[agents/product-owner/agent|product-owner]]
Inputs:
- `.project/workflows/<run-id>/02-categorize.md`
- Sprint or backlog context
Outputs:
- `.project/workflows/<run-id>/03-prioritize.md`
Pass:
- Backlog or sprint decision is explicit
OnFailure:
- Stop and flag the product prioritization gap

## Finalization
Agent: [[agents/product-owner/agent|product-owner]]
Inputs:
- `.project/workflows/<run-id>/03-prioritize.md`
Outputs:
- `.project/workflows/<run-id>/final-summary.md`
Pass:
- Ownership and next action are explicit
OnFailure:
- Stop and escalate to the user
