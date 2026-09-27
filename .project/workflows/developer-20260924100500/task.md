---
tags: [run/developer-20260924100500, workflow/developer, sprint/027]
workflow_def: "developer (dynamic agent chain)"
sprint_task: "[[sprints/sprint-027#^us-126]]"
---
# US-126 — Score par compétences ROME et « pourquoi cette offre »

Source : [[sprints/sprint-027]] · [[decisions/ADR-024-france-travail-platform-rome]] · précédents : US-124 ([[workflows/runs/developer-20260924080225]]), US-125 ([[workflows/runs/developer-20260924085500]]).
Workflow : ligne `Agent: developer`, chaîne dynamique `developer`.

Critères :
- `matching/rome-matching.ts` extrait de `job-matching.ts` : titre (1 si même code ROME, 0,6 même domaine, sinon score actuel), compétences (offre, à défaut métier, contre profil), barème sur 100.
- `job_matches.missing_skills` à côté de `matched_skills`, compétences exigées d'abord.
- Tests sur fixtures où ROME et mots-clés divergent (« Ingénieur logiciel » contre « Développeur full stack »).

Note : migrations 0030 à 0032 prises ; celle-ci sera 0033.
