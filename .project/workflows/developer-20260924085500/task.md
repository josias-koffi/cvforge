---
tags: [run/developer-20260924085500, workflow/developer, sprint/027]
workflow_def: "developer (dynamic agent chain)"
sprint_task: "[[sprints/sprint-027#^us-125]]"
---
# US-125 — Compétences du candidat, déduites du CV

Source : [[sprints/sprint-027]] · [[decisions/ADR-024-france-travail-platform-rome]] · précédent : US-124 ([[workflows/runs/developer-20260924080225]]).
Workflow : ligne `Agent: developer`, chaîne dynamique `developer`.

Critères :
- ROMEO `predictionCompetences` appelé sur les sections du CV, rappelé seulement si l'empreinte du texte change.
- Stockage dans `profile_rome_competences`, table annexe sans clé étrangère, couverte par la purge RGPD.
- Le candidat retire une compétence déduite ; elle n'est plus jamais reproposée.

Note : migrations 0030 (autre session) et 0031 (US-124) prises ; celle-ci sera 0032.
