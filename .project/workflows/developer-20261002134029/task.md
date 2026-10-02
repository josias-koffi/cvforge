---
tags: [run/developer-20261002134029, workflow/developer, sprint/034, task/US-166]
sprint: "[[sprints/sprint-034#US-166]]"
workflow: "[[agents/developer/agent]]"
next: "[[workflows/runs/developer-20261002134029/01-developer]]"
---
# US-166 — Alertes « nouvelle offre », sans spammer
Sprint 034, épic E27. `Agent: developer`, chaîne dynamique à une étape. Cadre : [[decisions/ADR-027-continuous-job-collection]] §4 bis.

Critères : e-mail dans le gabarit commun ; préférences sur /notifications (activées, seuil, rythme) ; plafond quotidien, heures calmes 21 h – 7 h, List-Unsubscribe ; un échec d'alerte ne bloque pas la collecte ; aperçu `email:preview` ; gratuit.
Décisions du propriétaire (2026-10-02) : activées par défaut ; 10 en immédiat, au-delà regroupé.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
