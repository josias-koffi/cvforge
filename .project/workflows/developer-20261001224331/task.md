---
tags: [run/developer-20261001224331, workflow/developer, sprint/034, task/US-163]
sprint: "[[sprints/sprint-034#US-163]]"
workflow: "[[agents/developer/agent]]"
next: "[[workflows/runs/developer-20261001224331/01-developer]]"
---
# US-163 — Flux France Travail en continu, par tranches de temps
Sprint 034, épic E27. `Agent: developer`, pas de ligne `Workflow:` : chaîne dynamique à une étape.
Cadre : [[decisions/ADR-027-continuous-job-collection]].

Critères : boucle 5 min réglable ; curseur persistant, rattrapage ≤ 31 j ; dichotomie au-delà de 1 150 (test 3 000) ; chevauchement 2 min ; verrou ; 429 → pause sans avancer ; compteur d'appels par source + alerte 80 % ; resynchronisation ≤ 24 h ; `buildSourceQueries` conservé pour `--since=31` et La bonne alternance.

Advisories : US-162 ouvert (application FT en homologation) ; sprint 035 (purge) non livré.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
