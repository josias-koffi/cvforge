---
tags: [run/developer-20260924110500, workflow/developer, sprint/027]
workflow_def: "developer (dynamic agent chain)"
sprint_task: "[[sprints/sprint-027#^us-127]]"
---
# US-127 — La carte d'offre explique, et le CV en tient compte

Source : [[sprints/sprint-027]] · [[decisions/ADR-024-france-travail-platform-rome]] · précédent : US-126 ([[workflows/runs/developer-20260924100500]]).
Workflow : ligne `Agent: developer`, chaîne dynamique `developer`.

Critères :
- `offer-card` et `offer-sheet` : « Vous avez » et « À mettre en avant », compétences ROME, source France Travail citée.
- « Postuler avec CVForge » transmet `missingSkills` à la génération de CV comme pistes à valoriser si le candidat les possède, jamais comme expérience à inventer ; le prompt le dit, un test le vérifie.

Note : migrations 0030 à 0033 prises ; celle-ci sera 0034.
