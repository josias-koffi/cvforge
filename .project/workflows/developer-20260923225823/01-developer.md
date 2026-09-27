---
tags: [run/developer-20260923225823, agent/developer, sprint/026]
task: "[[sprints/sprint-026#^us-122]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20260923225823/task]]"
next: "[[workflows/runs/developer-20260923225823/final-summary]]"
---
### Verdict: PASS
### Summary
Nouvelle couche `apps/api/src/france-travail/` : `ft.config.ts` (catalogue `FT_APIS` + `FRANCE_TRAVAIL_APIS`), `ft-token.service.ts` (un jeton par scope, requête partagée, erreur OAuth conservée), `ft-http.client.ts` + `ft-result.ts` (un limiteur par API, `FtResult` ok/vide/indisponible), `FranceTravailModule`, `ft:smoke <api|all>`. `FranceTravailSource` ne garde que pagination et mapping. Limiteur déplacé dans `shared/rate-limit/` (réexport conservé). `FRANCE_TRAVAIL_APIS` câblée dans compose et Terraform.
### Vérifications
- lint, tsc, build : OK ; 1 532 tests verts ; couverture du nouveau code ≥ 94 %.
- `ft:smoke all` en direct : offres, romeo, rome-metiers, rome-competences et rome-fiches-metiers répondent ; La Bonne Boîte répond 403 « Invalid scope » (droit manuel à obtenir).
- `ft:smoke:offres "développeur" 44` : 25 offres, filtres non vides, vérification de détail `true`.
### Findings
- [ADVISORY] ROMEO exige `options.nomAppelant` et accepte plusieurs textes par appel.
- [ADVISORY] Les quotas ROME et ROMEO sont inconnus : 1 appel/s par défaut.
- [BLOCKING pour US-119, pas pour US-122] La Bonne Boîte n'est pas accordée à l'application.
### Refactors applied
- `job-search.module.ts` : une liste d'adaptateurs partagée au lieu de deux `buildJobSources()`, donc un seul jeton.
- `france-travail.config.ts` et son test supprimés (code mort après migration).
### Next action
US-123 (référentiel ROME local), que les API vérifiées permettent maintenant.
