# Stage 2 — Design

## Design Decision

This is non-UI infrastructure work, so the design stage is a documented skip.

## Implementation Shape

- Create a small `smtp` module inside `apps/api/src/`.
- Expose a typed config factory and an injection token for future mail services.
- Keep configuration env-driven and provider-neutral.
- Fail on partial SMTP configuration, but allow the module to stay disabled when no SMTP env is set yet.

## UX / Non-UI Skip Decision

- No user interface or UX surface changes are required.
- No accessibility impact applies to this task.

## Pass Check

- Proposed design fits the analyzed scope: yes
- UX risks or non-UI skip decision are explicit: yes
