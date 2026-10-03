---
tags: [run/tech-lead-20261001221038, stage/01, agent/tech-lead]
sprint: "[[sprints/sprint-034#US-162]]"
agent: "[[agents/tech-lead/agent]]"
prev: "[[workflows/runs/tech-lead-20261001221038/task]]"
next: "[[workflows/runs/tech-lead-20261001221038/final-summary]]"
---
# 01 — Tech Lead
**Verdict : PASS partiel** (4 critères sur 5).

- ADR-027 écrit et accepté (`decisions/ADR-027-continuous-job-collection.md`) : flux national FT toutes les 5 min par tranches de temps, sites carrière suivis toutes les 30 min, budget (300 à 600 appels/jour FT, alerte à 1 000 ; cycle carrière ≤ 15 min par logiciel, soit ≤ 900 entreprises à 1/s et ≤ 1 800 à 2/s), stockage limité aux offres qui correspondent (identifiants seuls pour la détection de nouveauté), récap de 6 h conservé.
- ADR-023 : renvoi en tête et en §2, chiffre de 10/s mesuré cité. `sprint-025.md` : « quotidienne » barré et remplacé.
- Section « Licence » complète, relecture juridique recommandée avant US-168.
- Débit `offres` 4 → 8 (`ft.config.ts`, tests, `.env.example` ; en-tête `.env.example` corrigé ADR-026 → ADR-023/027). 45 tests `france-travail` verts, eslint et tsc propres.
- **Ouvert** : application en homologation, demande de production non déposée (relevé propriétaire du 2026-10-01). Texte de la demande prêt dans l'ADR. Action propriétaire.
