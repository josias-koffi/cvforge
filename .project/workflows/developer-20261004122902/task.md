---
tags: [run/developer-20261004122902, workflow/developer, sprint/035, task/US-169]
sprint: "[[sprints/sprint-035#US-169]]"
workflow: "[[agents/developer/agent]]"
next: "[[workflows/runs/developer-20261004122902/01-developer]]"
---
# US-169 — Anonymiser les offres fermées et purger les offres de plus de 30 jours
Sprint 035, épic E28. `Agent: developer`, chaîne dynamique à une étape. Cadre : licence France Travail (art. 8), [[decisions/ADR-027-continuous-job-collection]].

Critères : anonymisation à la fermeture (`raw` sans contact ni entreprise, `jobs` vidé quand tout est fermé) ; purge quotidienne sous le verrou de `job_digest_runs` (publication ou première détection > 30 j, ou fermée depuis 30 j), sauf candidature active ; candidature indépendante de l'offre ; rattrapage `jobs:purge --dry-run` ; compteurs dans l'admin ; constante 30 jours partagée.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
