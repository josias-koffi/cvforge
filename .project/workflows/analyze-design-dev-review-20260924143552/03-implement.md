---
tags: [run/analyze-design-dev-review-20260924143552, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924143552/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924143552/04-review]]"
---
### Verdict: PASS
### Summary
- `@cvforge/types` : outils et étapes (`acquisition.ts`).
- API : migration 0039 `acquisition_events` (index unique jour/outil/étape/`ip_hash`) ; module `acquisition/` avec `POST /public/events` en 204, service, store (`on conflict do nothing`) et purge à 90 j.
- Métriques : `readAcquisitionSteps`, `readAtsActivations`, `acquisition[]` dans `AdminMetrics` et dans le CSV.
- Web : `FunnelCard`. Landing : `trackToolEvent` (beacon, repli `fetch`), BFF `/api/events`, 4 étapes branchées dans `AtsChecker`.

Tests : API 1768, web 382, landing 123, types 17, tous verts. Lint et tsc propres. Nouveau code à 100 % de lignes.
### Findings
- [ADVISORY] Diff de code d'environ 600 lignes, plus environ 800 de tests. Au-delà de la limite de 400 lignes par PR : livrer en deux PR, l'API d'abord, puis le web et la landing.
- [ADVISORY] Écart avec le design : « Email saisi » est rapporté aux résultats, pas aux clics. Pour l'ATS, le formulaire email et l'appel à l'action sont deux branches parallèles après le résultat.
- [ADVISORY] Le test de démarrage journalise un échec de purge sur la base de dev locale, non migrée en 0039. Ce n'est pas bloquant : il faut lancer la migration en local.
- [ADVISORY] Six fichiers touchés étaient déjà hors Prettier avant cette story. Je ne les ai pas reformatés, pour ne pas noyer le diff.
### Refactors applied
- `shared/ip-hash.ts` : sel et hachage d'IP extraits de `ats.config.ts` et de `ats-scan.service.ts`, réutilisés par les événements (environ 8 lignes économisées).
- `lib/forwarded-for.ts` : sorti de la route ATS, où la route unlock l'importait par `../../route` ; ses tests ont suivi.
### Next action
Revue QA sur les 4 critères.
