---
tags:
  [
    run/analyze-design-dev-review-20260602180000,
    workflow/analyze-design-dev-review,
    agent/developer,
    stage/03,
  ]
run: "[[workflows/runs/analyze-design-dev-review-20260602180000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/developer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602180000/02-design]]"
---

# Stage 3 — Implement

### Verdict: PASS

### Summary

Single-line fix applied in `/home/devops/perso/projets/koklo/koklo-infra/stacks/cvforge/docker-compose.yml`. Volume mount corrected from `/workspace/apps/api/.data` to `/workspace/.data` to match `process.cwd()` inside the container (WORKDIR `/workspace` per `docker/api.Dockerfile`).

### Repos modified

- **koklo-infra** (`/home/devops/perso/projets/koklo/koklo-infra`):
  - `stacks/cvforge/docker-compose.yml` — volume path fix (1 line changed)

### Findings

- [ADVISORY] Existing state files in the running container live at `/workspace/.data/` inside the old ephemeral layer — they will be lost on next `--force-recreate`. Users who have data today will see it gone after the next deploy. A one-time recovery can be done before the deploy: `docker cp <container>:/workspace/.data/ <backup_path>` then restore into the new volume.
- [ADVISORY] The Makefile `backup-cvforge` target backs up `cvforge_api_data` volume but that volume was empty (wrong path). After the fix, the volume will contain real data and the backup target becomes meaningful.
- [ADVISORY] Interview module also uses `resolve(process.cwd(), ".data", ...)` — it is equally affected and equally fixed by this change.

### Tests / quality gates

No app code changed; no tests to run. IaC change is a pure config diff — verified by diff inspection.

### Next action

Deploy with `make deploy-cvforge` from `koklo-infra`; verify data persists after restart.

---

**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602180000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602180000/02-design]] · next [[workflows/runs/analyze-design-dev-review-20260602180000/04-review]]
