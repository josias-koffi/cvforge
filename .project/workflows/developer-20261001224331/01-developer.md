---
tags: [run/developer-20261001224331, stage/01, agent/developer]
sprint: "[[sprints/sprint-034#US-163]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261001224331/task]]"
next: "[[workflows/runs/developer-20261001224331/final-summary]]"
---
# 01 — Developer
**Verdict : PASS partiel** (8 critères sur 9).

- `sources/france-travail.stream.ts` : tranche `minCreationDate`/`maxCreationDate` à la seconde, sans mot-clé ni département ; coupe en deux quand `Content-Range` dépasse 1 150. Test sur 3 000 offres fictives : aucune perdue, jamais de `range` au-delà du plafond.
- `job-stream.service.ts` : boucle (`JOB_STREAM_INTERVAL_MINUTES`, 5 par défaut), chevauchement 2 min, rattrapage heure par heure plafonné à 31 jours, curseur avancé seulement après stockage, 429 → pause sur `Retry-After`. Interrupteur `JOB_STREAM_ENABLED`, coupé par défaut.
- Verrou : bail en base `job_stream_cursors` (migration 0051), `UPDATE` conditionnel, expiration 10 min.
- Compteur : `job_source_calls` (France Travail `offres` et logiciels de recrutement), écrit chaque minute ; colonne « Appels du jour » et alerte à 80 % de `FRANCE_TRAVAIL_OFFRES_MONTHLY_QUOTA` dans l'admin des sources.
- Resynchronisation : chaque matin, les annonces FT non revues depuis 24 h passent par `/offres/{id}` (fermées ou réécrites). Une offre fermée sort d'« Offres du jour », sauf si le candidat l'a gardée ou y a postulé.
- Refactor : `job-digest.service.ts` passe de 381 à 268 lignes (`job-digest.selection.ts`).
- Tests : API 2 085/2 085, web 374/374, tsc et eslint propres.
- **Ouvert** : « disparaît des alertes non encore envoyées » ne peut pas être vérifié, les alertes n'existent pas encore (US-165/166). Le contrôle `isStillOpen` avant envoi est déjà un critère d'US-165. La bonne alternance n'a pas été vérifiée en direct.
