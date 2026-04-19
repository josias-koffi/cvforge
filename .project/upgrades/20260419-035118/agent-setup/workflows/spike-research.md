<!-- generated-by: /init-project -->

# Workflow: Spike Research

## Trigger

A question cannot be answered with current knowledge and needs time-boxed investigation.

## Steps

1. **Frame** (`tech-lead` or `analyst`) — write question + time-box (max hours) in `.project/spikes/SPIKE-NNN.md`. Pass: question specific.
2. **Investigate** (`developer` or `analyst`) — research inside time-box, document findings, no implementation. Pass: time-box respected, findings written.
3. **Decide** (`tech-lead`) — proceed/reject/defer with rationale + ADR if architectural. Pass: decision unambiguous.

## Rollback

None — spikes are exploratory; stop and report if time-box exceeded.
