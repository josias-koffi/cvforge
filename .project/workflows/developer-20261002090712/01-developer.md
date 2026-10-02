---
tags: [run/developer-20261002090712, stage/01, agent/developer]
sprint: "[[sprints/sprint-034#US-165]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261002090712/task]]"
next: "[[workflows/runs/developer-20261002090712/final-summary]]"
---
# 01 — Developer
**Verdict : PASS** (6 critères sur 6).

- `LiveMatcher` (live-matching.ts), sink des deux flux : chaque offre est notée contre chaque recherche (`rejectionReason` + `scoreJob`, contexte ROME), sans dépendance IA. `previewJob` note une offre sans la stocker.
- « Correspond » = seuil du récap (35) **et** intitulé ou compétences > 0. Sans cette condition, un « Comptable » à Nantes atteignait 37 pour une recherche de développeur. Consigné dans ADR-027 §4.
- Stockage seulement si une recherche correspond ; une seule fois par offre même si plusieurs recherches la veulent.
- Au-dessus de 60 (`alertThresholdFor`, le choix du candidat arrive avec US-166) : `isStillOpen` (fermée → `closeListing`, inconnu → on alerte), puis `job_matches` `kind = alert` avec `source`, `published_at`, `detected_at` (migration 0053).
- Récap : une alerte n'en sort qu'une fois `alert_sent_at` posé ; en attente, `createMany` la reprend en `digest`.
- Cockpit, onglet Marché : « Délai publication → alerte », médiane et 90e centile par source (`percentile_cont`), médiane FT en rouge au-delà de 10 min ; ajouté à l'export CSV.
- Tests : API 2 114, web 377, types 52 ; tsc et eslint propres.
