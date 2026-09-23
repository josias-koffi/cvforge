---
tags: [run/developer-20260923232118, workflow/developer, sprint/026]
workflow_def: "developer (dynamic agent chain)"
sprint_task: "[[sprints/sprint-026#^us-123]]"
---
# US-123 — Référentiel ROME 4.0 local et substitutions (`apps/api/src/rome/`)

Source : [[sprints/sprint-026]] · [[decisions/ADR-024-france-travail-platform-rome]] · prérequis livré : [[workflows/runs/developer-20260923225823]] (US-122).
Workflow : ligne `Agent: developer`, chaîne dynamique `developer`.
Critères : migration 0028 (6 tables), `rome:sync` + `:built` rejouable, verrou en base, échec sans effet, hebdomadaire ; substitutions réécrites partout, doublons supprimés, journal ; source citée.
