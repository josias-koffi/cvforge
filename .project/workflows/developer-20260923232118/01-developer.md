---
tags: [run/developer-20260923232118, agent/developer, sprint/026]
task: "[[sprints/sprint-026#^us-123]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20260923232118/task]]"
next: "[[workflows/runs/developer-20260923232118/final-summary]]"
---
### Verdict: PASS (story ouverte : 3 critères sur 4)
### Summary
`apps/api/src/rome/` : migration 0028 (6 tables), mapping pur, client en trois appels (`champs`), store Postgres (verrou, remplacement transactionnel par lots, moteur de substitution), `RomeSyncService` (hebdomadaire, 6 h d'attente après un échec, refus d'une perte de plus de 10 %), `rome:sync` et `:built`. Synchro réelle : 1 911 / 14 301 / 35 595 / 106 792 en environ 10 s ; trois rejeux identiques.
### Vérifications
- lint, tsc, build OK ; 1 568 tests verts ; logique ROME couverte à 100 % des lignes.
- Verrou, reprise d'un run mort, rollback sur échec : testés sur PGlite.
### Findings
- [BLOCKING pour le critère 3] API Substitutions : jeton délivré, 403 sur `/rome-substitutions/v1/*`. L'adaptateur attend une réponse réelle.
- [ADVISORY] Un appel de version a été une fois vide juste après une liste de 11 Mo : il est désormais retenté.
- [ADVISORY] Défaut Terraform et compose de `FRANCE_TRAVAIL_APIS` élargi aux API vérifiées : la synchro tournera en production.
### Next action
Demander l'accès à Substitutions et à La Bonne Boîte ; enchaîner sur US-118.
