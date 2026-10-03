---
tags: [run/developer-20261001233130, workflow/developer, sprint/034, task/US-164]
sprint: "[[sprints/sprint-034#US-164]]"
workflow: "[[agents/developer/agent]]"
next: "[[workflows/runs/developer-20261001233130/01-developer]]"
---
# US-164 — Sites carrière interrogés plusieurs fois par heure
Sprint 034, épic E27. `Agent: developer`, chaîne dynamique à une étape. Cadre : [[decisions/ADR-027-continuous-job-collection]] §2-§4.

Critères : entreprises suivies ou dont une offre a correspondu en 30 j lues toutes les 30 min, les autres une fois par jour ; « nouvelle » = identifiant jamais vu sur ce site, date de détection enregistrée à côté de la date annoncée ; limiteur par hôte respecté, 429/403 → rythme quotidien 24 h ; pas de charge au-delà du budget d'ADR-027, vérifié sur une journée de staging.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
