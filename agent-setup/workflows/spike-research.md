<!-- generated-by: /init-project -->
---
tags: [workflow/definition, workflow/spike-research]
parent: "[[_README]]"
---
# Workflow: Spike Research

## Mode
orchestrated

## Used by
<!-- Auto-appended by `sprint` / `run-workflow` when this workflow is triggered. -->
<!-- - [[sprints/sprint-NNN#US-XXX]] — YYYY-MM-DD → [[workflows/runs/<run-id>]] -->

## Stage 1 - Frame
Agent: [[agents/analyst/agent|analyst]]
Inputs:
- Question or uncertainty to investigate
- Vision constraints
Outputs:
- `.project/workflows/<run-id>/01-frame.md`
Pass:
- Research question is specific
- Time box is explicit
OnFailure:
- Stop and ask for a narrower research scope

## Stage 2 - Investigate
Agent: [[agents/analyst/agent|analyst]]
Inputs:
- `.project/workflows/<run-id>/01-frame.md`
Outputs:
- `.project/workflows/<run-id>/02-investigate.md`
Pass:
- Findings are documented inside the time box
- Unknowns and tradeoffs are explicit
OnFailure:
- Stop and report that the time box was insufficient

## Stage 3 - Decide
Agent: [[agents/tech-lead/agent|tech-lead]]
Inputs:
- `.project/workflows/<run-id>/02-investigate.md`
Outputs:
- `.project/workflows/<run-id>/03-decide.md`
Pass:
- Outcome is proceed, reject, or defer
- Rationale is explicit
OnFailure:
- Stop and request a follow-up spike or clarification

## Finalization
Agent: [[agents/tech-lead/agent|tech-lead]]
Inputs:
- `.project/workflows/<run-id>/03-decide.md`
Outputs:
- `.project/workflows/<run-id>/final-summary.md`
Pass:
- Decision and next action are unambiguous
OnFailure:
- Stop and escalate to the user
