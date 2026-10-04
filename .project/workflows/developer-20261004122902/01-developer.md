---
tags: [run/developer-20261004122902, workflow/developer, stage/01-developer, agent/developer, result/pass]
sprint: "[[sprints/sprint-035#US-169]]"
workflow: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261004122902/task]]"
next: "[[workflows/runs/developer-20261004122902/final-summary]]"
---
# 01 — Developer : US-169 — PASS (7/7)

**Livré**
- Migration 0056 : `anonymized_at` sur `job_listings` et `jobs`, index de la file à anonymiser et de `job_matches.application_id`, type de run `purge` dans `job_digest_runs`.
- `job-retention.pg-store.ts` : chemins JSON identifiants par source (`IDENTIFYING_RAW_PATHS` : France Travail `contact`, `agence`, `entreprise.nom/description/url/logo` ; Greenhouse `company_name` ; SmartRecruiters `company` ; La bonne alternance `workplace.*`), retirés en SQL avec `#-`. L'annonce perd aussi `company_name` ; l'offre, une fois toutes ses annonces fermées, perd nom, clé et logo de l'entreprise.
- Anonymisation immédiate : toute fermeture passe par `refreshClosedAt` (sorti avec `closeListing` et `closeListingsMissingFrom` dans `jobs.closing.ts`). Une annonce qui revient est réécrite par la source, `anonymized_at` remis à null.
- `JobPurgeService` : verrou `job_digest_runs` (run `purge`), anonymise ce qui reste puis supprime par lots de 1 000 les offres expirées (cascade annonces, liens, correspondances), sauf candidature brouillon/envoyée/entretien prévu. Vérifié toutes les heures, une fois par jour de Paris, **seulement après une première purge lancée à la main**. Statistiques dans le run, affichées dans l'onglet des collectes de l'admin.
- Script `jobs:purge` (`--dry-run` : compte sans écrire), version `:built` pour le conteneur.
- Une seule constante 30 jours : `DEFAULT_MAX_AGE_DAYS` (aussi dans `job-matches.controller.ts`).

**Vérification** : tsc et eslint OK (API, web). Tests API 2 191 avant découpe des tests, puis 504 sur job-search. Ajouts : réponse France Travail réelle et annonce Greenhouse réelle en fixtures (coordonnées du recruteur remplacées), réouverture, rattrapage, fenêtres, candidatures actives/inactives/supprimées, candidature entière après purge, verrou partagé. Sur la base locale (vrai Postgres) : dry-run 4 annonces / 376 offres sur 3 050, puis anonymisation et purge dans une transaction annulée.
**Non vérifié** : l'onglet admin dans un navigateur.
