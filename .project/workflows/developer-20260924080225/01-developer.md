---
tags: [run/developer-20260924080225, agent/developer, sprint/027]
task: "[[sprints/sprint-027#^us-124]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20260924080225/task]]"
next: "[[workflows/runs/developer-20260924080225/final-summary]]"
---
### Verdict: PASS
### Summary
- **Mesuré avant d'écrire.** La recherche par ROME **n'égale pas** les mots-clés, elle les **complète**. « Ingénieur logiciel » 44 : 8 offres par mots-clés, **+16** par ROME. « Commercial » 31 : 108 par mots-clés, 10 par ROME.
- **Décision.** Les requêtes ROME **s'ajoutent** aux requêtes par mots-clés, par (métier ROME confirmé × département), partagées entre candidats. Offres v2 est interrogée en `codeROME`, La bonne alternance en `romes` (clé de cache distincte).
- **Stockage.** Le mapper conserve `romeCode`, le libellé d'appellation et les compétences (E ou S). Migration **0031** (la 0030 est prise par une autre session).
### Vérifications
- API : 1 621 tests verts (deux passages), lint, tsc et build OK. Couverture du code touché : 94 %.
- **Collecte réelle** (locale, sans sélection ni envoi) : 2 238 offres, 0 erreur. France Travail : 1 431 offres, toutes avec leur ROME, 423 avec leurs compétences.
### Findings
- [MESURÉ] Offres v2 ne donne **jamais** de SIRET (ni en recherche, ni sur le détail), ni de code d'appellation : seulement le libellé. Aucune colonne SIRET.
- [ADVISORY] Détacher une annonce ne recalcule pas le ROME du job d'origine.
- [ADVISORY] Une requête ROME nationale (M1203) touche le plafond de 1 150 résultats.
### Refactors applied
- `job-digest.service.ts` 608 → 390 : `job-collector.ts`, `job-digest.steps.ts`, `paris-time.ts`.
- `jobs.pg-store.ts` 601 → 365 : `jobs.rows.ts`, `jobs.search.ts`. Constructeur de job unique pour `createJob` et `detachListing`, qui étaient dupliqués.
