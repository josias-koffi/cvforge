---
tags: [run/developer-20260924190000, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924190000/task]]"
next: "[[workflows/runs/developer-20260924190000/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-118, reste

- `exportByUserEmail` sur `SearchProjectRomeStore` et `ProfileCompetencesStore` : toutes les lignes du compte, écartées comprises, sans l'adresse du propriétaire.
- `PrivacyExportPayload` gagne `ownedSearchJobs` et `ownedProfileCompetences`. Les deux stores sont exportés par leurs modules et injectés dans `PrivacyService`.
- Les compétences ROME (`profile_rome_competences`) sont ajoutées aussi : elles étaient purgées, mais pas exportées non plus.
- **Test** : `privacy-rome-export.test.ts` utilise les vrais stores ROME, et vérifie qu'aucune ligne d'un autre compte ne sort.
- **Vérifié en réel** : 8 appellations et 22 compétences sur le compte local, identiques à la base.
- **Suite API** : 1743 tests verts.
