---
tags: [run/analyze-design-dev-review-20260923233426, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260923233426/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260923233426/04-review]]"
---
### Verdict: PASS
### Summary
- **API.** `RomeoClient` (un appel pour tous les textes, `nomAppelant`) et `bestAppellations` : tour par tour entre les textes, postes visés avant le titre du CV. Lecteur local `rome_appellations` (sans accents, préfixes d'abord, `%` et `_` échappés) et `GET /rome/appellations`.
- **Stockage.** `search_project_rome` (migration 0029, sans clé étrangère), store et service : suggérer, confirmer, écarter. Nouvelles routes `PUT` et `DELETE /profiles/:id/search-project/rome/:code`. Purge dans `deleteByUserEmail`, déclarée dans `ROME_CODE_HOLDERS`.
- **Web.** Carte « Vos métiers ».
### Vérifications
- API : 1 601 tests. Web : 340 tests, typecheck et lint verts. Build OK.
- **En réel** (compte dev-local) : enregistrer, confirmer, écarter, autocomplétion « comptable », rechargement. Les choix tiennent, et une suggestion écartée ne revient pas.
### Findings
- [CORRIGÉ] Classement au seul score : le titre du CV prenait les 5 places. Remplacé par le tour par tour.
- [CORRIGÉ, antérieur] « Postes visés » coupait espaces et retours à la ligne à chaque frappe. Un intitulé ne pouvait qu'être collé. Nouveau composant `LinesTextarea`.
- [ADVISORY] `search-project-form.tsx` : 376 → 318 lignes (cible 300).
### Refactors applied
- Options et carte des alertes extraites du formulaire (−58 lignes).
