---
tags:
  [
    run/analyze-design-dev-review-20260602180000,
    workflow/analyze-design-dev-review,
    agent/designer,
    stage/02,
  ]
run: "[[workflows/runs/analyze-design-dev-review-20260602180000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602180000/01-analyze]]"
---

# Stage 2 — Design

### Verdict: PASS (no UI change)

### Decision

No UX or UI change required. This is a pure infrastructure fix — a single-line volume path correction in the IaC docker-compose.yml.

### Design

Change in `stacks/cvforge/docker-compose.yml` (koklo-infra repo):

```yaml
# BEFORE (broken)
api:
  volumes:
    - api_data:/workspace/apps/api/.data

# AFTER (fixed)
api:
  volumes:
    - api_data:/workspace/.data
```

This aligns the volume mount with `process.cwd()/.data` inside the container (WORKDIR is `/workspace`).

### UX risk

None. The change is transparent to users — data simply persists correctly instead of being silently dropped.

### Advisory: deploy playbook hardening

The Ansible playbook should also snapshot the ephemeral `.data/` directory from the running container before force-recreating it, giving an escape hatch for any data that currently lives in the wrong path. This is a separate follow-up task.

---

**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602180000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602180000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260602180000/03-implement]]
