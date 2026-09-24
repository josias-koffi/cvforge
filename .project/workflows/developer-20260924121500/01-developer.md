---
tags: [run/developer-20260924121500, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924121500/task]]"
next: "[[workflows/runs/developer-20260924121500/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-128

**Contrat mesuré en direct (2026-09-24)** : scope `api_stats-offres-demandes-emploiv1 offresetdemandesemploi`, base `stats-offres-demandes-emploi/v1`, POST `/indicateur/stat-perspective-employeur` (tension 1–5, annuelle), `/stat-offres` (trimestrielle, `TOFF` et cumul 12 mois), `/stat-demandeurs` (catégorie A, 1,4 Mo). Pas de salaire par ROME : `stat-salaires-en-poste` ne répond que par FAP, et les tranches de salaire des offres reviennent vides.

**Livré** :
- `marche-travail` dans `FT_APIS` (vérifiée), compose et Terraform.
- Module `market/` : client, lectures pures, store, service (contrôle horaire, relecture à 30 jours, 40 lectures max, départements de la recherche d'abord), `GET profiles/:id/market`, script `market:refresh`.
- Migration **0035** `market_stats` (0031 était prise) : chaque chiffre garde sa période.
- Salaire médian : calculé sur nos offres (milieu des fourchettes, au moins 5 offres, en euros), avec sa propre source. `readYearlySalaryRange` ajoutée à `salary.ts`.
- « Département voisin » = autre département de la même région (table statique tirée du référentiel de l'API).
- Digest : une ligne par changement notable (niveau de tension, ±⅓ des offres sur 12 mois) ; `digestNotification` déplacée dans `job-digest.steps.ts` (le service passe de 393 à 381 lignes).
- Web : carte `MarketRadar` sur `/ma-recherche`.

**Vérifié** : 1 700 tests API et 358 tests web passent, lint et typecheck au vert. En réel : 10 lectures en 22 s ; M1203 × 44 : tension 5, 6 770 offres sur 12 mois, 220 demandeurs, médiane de 29 500 € sur 18 offres. Note de changement écrite de bout en bout. Encart vide vérifié dans le navigateur ; encart rempli vérifié par le service et par les tests de rendu.
