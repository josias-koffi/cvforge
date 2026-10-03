---
tags: [run/developer-20261001233130, stage/01, agent/developer]
sprint: "[[sprints/sprint-034#US-164]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261001233130/task]]"
next: "[[workflows/runs/developer-20261001233130/final-summary]]"
---
# 01 — Developer
**Verdict : PASS partiel** (3 critères sur 4).

- « Suivie » n'existe pas comme bouton : dérivée d'une offre gardée ou postulée, ou d'une candidature importée depuis le site, sur 90 jours. Une offre qui a correspondu compte 30 jours. Retrouvée en SQL : match → annonce → `job_board_postings` → `job_boards`. Écrit dans ADR-027 §2.
- `job_board_postings` (migration 0052) : identifiants seuls, `announced_at` et `first_seen_at`. Remplie par la passe quotidienne et la passe fréquente ; « nouvelle » = insérée par cette lecture (`xmax = 0`).
- `BoardStreamService` : toutes les 30 min (`JOB_BOARDS_INTERVAL_MINUTES`), même interrupteur que le flux FT, bail `boards_frequent`. Plafond par logiciel = débit × 15 min (900 Lever, 1 800 Greenhouse), intérêt le plus récent d'abord ; le surplus reste au quotidien et s'affiche en alerte dans l'admin (`last_report`).
- Limiteur par fournisseur inchangé et partagé avec la passe quotidienne. `BoardRefusedError` sur 429 (après les nouvelles tentatives) ou 403 (sans insister) → `frequent_paused_until` = +24 h.
- SmartRecruiters ne paie plus d'appel de détail pour une offre déjà vue.
- Tests : API 2 103, web 376 ; tsc et eslint propres.
- **Ouvert** : le budget sur une journée de staging ne peut pas être vérifié en local.
