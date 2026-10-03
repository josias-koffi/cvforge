---
tags: [run/tech-lead-20261001221038, workflow/tech-lead, sprint/034, task/US-162]
sprint: "[[sprints/sprint-034#US-162]]"
workflow: "[[agents/tech-lead/agent]]"
next: "[[workflows/runs/tech-lead-20261001221038/01-tech-lead]]"
---
# US-162 — ADR-027 « Collecte continue » et amendement d'ADR-023
Sprint 034, épic E27. Pas de ligne `Workflow:` : `Agent: tech-lead`, chaîne dynamique à une étape.

Critères :
- ADR-027 : collecte continue (flux FT + sites carrière), budget chiffré, stockage limité aux offres qui correspondent, récap du matin conservé.
- ADR-023 renvoie vers ADR-027 ; règle « collecte quotidienne » de sprint-025 marquée remplacée.
- Section « Licence » (art. 5.1, pas d'altération, resync 24 h, pas de tiers, art. 8) + relecture juridique recommandée avant US-168.
- Statut francetravail.io consigné ; si homologation : demande de production déposée et licence acceptée.
- Débit `offres` de 4 à 8 appels/s.

Advisory : sprint 035 (E28, purge) non livré — prérequis du flux (US-163), pas d'US-162.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
