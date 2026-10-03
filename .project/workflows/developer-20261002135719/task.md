---
tags: [run/developer-20261002135719, workflow/developer, sprint/034, task/US-168]
sprint: "[[sprints/sprint-034#US-168]]"
workflow: "[[agents/developer/agent]]"
next: "[[workflows/runs/developer-20261002135719/01-developer]]"
---
# US-168 — Enrichissement IA des alertes : « pourquoi cette offre vaut la peine » (payant)
Sprint 034, épic E27. `Agent: developer` (+ designer pour le bloc e-mail et la carte), chaîne dynamique à une étape. Cadre : [[decisions/ADR-027-continuous-job-collection]].

Critères : option désactivée par défaut avec prix affiché ; solde vide → alerte sans analyse, mention « analyse IA non incluse » ; plafond 20 analyses/jour/candidat (`JOB_ALERT_ENRICH_DAILY_CAP`) ; JSON validé (verdict, raisons, vigilance, à mettre en avant), rien d'inventé ; filtre « à passer » au choix du candidat ; analyse à côté de l'offre, jamais à sa place ; 1 crédit/jour (Paris) après la première analyse réussie, unicité (candidat, jour) ; distinct du classement du matin ; journalisé dans `ai_usage_events` (`job_alert_enrich`) ; réutilisé par « Postuler » sans nouvel appel ; hors boucle de collecte, 2 min au plus ; tests.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
