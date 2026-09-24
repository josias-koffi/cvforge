---
tags: [run/developer-20260924150000, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924150000/task]]"
next: "[[workflows/runs/developer-20260924150000/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-121

## Livré
- **Migration 0037** : table `companies` indexée par SIREN, données publiques seulement ; les dirigeants ne sont pas copiés.
- **Module `apps/api/src/companies/`** :
  - `company-record.ts` : lecture pure de l'Annuaire et d'Egapro, badges et fiche ;
  - `company-sources.ts` : Annuaire puis Egapro, 5 appels/s, Egapro seulement si l'index est déclaré ;
  - `companies.pg-store.ts` : les SIREN dus sont lus directement depuis `hiring_companies` ;
  - `companies.service.ts` : relecture toutes les 30 jours, au plus 100 lectures par heure ;
  - script `companies:refresh`.
- **`HiringCompaniesService`** : `view` ajoute les badges, et `detail` donne la fiche. Il reçoit `GET profiles/:id/hiring-companies/:siret`, qui répond 404 hors de la liste.
- **Web** :
  - badges et lien sur chaque carte ;
  - page `/entreprises/[siret]` : établissement, entreprise, engagements, sources, candidature spontanée ;
  - libellé « Fiche entreprise » dans le fil d'Ariane.

## Vérifié en réel (2026-09-24)
- 178 des 179 SIREN ont été lus sans aucun SIREN inconnu. Un échec réseau sera repris à l'heure suivante.
- Badges relevés : 106 index Egapro, 46 bilans GES, 7 ESS, 1 entreprise inclusive, 0 société à mission.
- Sur le compte de test (Nantes, placé temporairement puis restauré), 64 des 100 cartes portent au moins un badge.
- La fiche EVERIENCE est rendue en 200. Un SIRET hors de la liste mène à la page 404.

## Tests
- API : 1733 tests verts.
- Web : 372 tests verts.
- tsc et eslint propres sur les fichiers touchés.
