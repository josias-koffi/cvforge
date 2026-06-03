---
tags:
  [
    run/analyze-design-dev-review-20260602180000,
    workflow/analyze-design-dev-review,
  ]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task: Fix deployment data loss — koklo-infra CVForge stack

**Source**: ad hoc  
**Date**: 2026-06-02  
**IaC repo**: /home/devops/perso/projets/koklo/koklo-infra

## Problem statement

`make deploy-cvforge` (runs Ansible with `--tags cvforge`) causes data loss on each deployment:

- **Lost**: credits, generated CVs, generated cover letters
- **Persists**: user profiles (seemingly)

## Diagnosis (pre-run)

### Root cause

The API Docker image sets `WORKDIR /workspace` (runner stage in `docker/api.Dockerfile`), so `process.cwd()` inside the container is `/workspace`.

All file-based stores use `resolve(process.cwd(), ".data", "<file>.json")`:

- credits → `/workspace/.data/credits-state.json`
- auth accounts → `/workspace/.data/auth-state.json`
- applications (CVs + letters) → `/workspace/.data/applications-state.json`
- templates → `/workspace/.data/templates-state.json`
- notifications → `/workspace/.data/notifications-state.json`

The IaC `stacks/cvforge/docker-compose.yml` mounts the volume at:

```
api_data:/workspace/apps/api/.data
```

**Mismatch**: data is written to `/workspace/.data/` but the volume covers `/workspace/apps/api/.data/`. All writes land on the ephemeral container layer → lost on every `--force-recreate`.

### Why profiles appear to persist

"Profiles" may refer to something stored client-side (browser localStorage) or in the user's session cookie, which survives server restarts. Auth state is also lost — users would need to re-authenticate.

## Available Repositories (2)

- infra [ansible+docker] koklo-infra at /home/devops/perso/projets/koklo/koklo-infra — IaC for CVForge VPS20 deployment
- backend [nestjs] cvforge-api at /home/devops/perso/projets/cvforge — CVForge monorepo (API + frontend)
