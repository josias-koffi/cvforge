---
tags: [run/developer-20261002090712, workflow/developer, sprint/034, task/US-165]
sprint: "[[sprints/sprint-034#US-165]]"
workflow: "[[agents/developer/agent]]"
next: "[[workflows/runs/developer-20261002090712/01-developer]]"
---
# US-165 — Correspondance au fil de l'eau
Sprint 034, épic E27. `Agent: developer`, chaîne dynamique à une étape. Cadre : [[decisions/ADR-027-continuous-job-collection]] §4.

Critères : score déterministe sans IA ; stockage seulement si une recherche correspond ; correspondance `alert` datée au-dessus du seuil ; vérification en direct avant l'alerte ; une alerte envoyée ne revient pas au récap ; délai publication → correspondance (médiane, 90e centile par source) dans le cockpit.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
