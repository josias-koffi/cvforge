---
tags: [run/developer-20261004131152, workflow/developer, stage/01-developer, agent/developer, result/fail]
sprint: "[[sprints/sprint-035#US-170]]"
workflow: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261004131152/task]]"
next: "[[workflows/runs/developer-20261004131152/final-summary]]"
---
# 01 — Developer : US-170 — 7/8 (politique à publier par le propriétaire)

**Livré**
- Migration 0057 : `applications.deletion_warned_at`, table `application_retention_runs`, défaut des préférences e-mail avec `applicationDeletionWarning`.
- Règles pures `applications/application-retention.rules.ts` : 365 jours depuis `updated_at`, avertissement à J-15, jamais moins de 15 jours après l'avertissement. Une modification postérieure à l'avertissement l'annule. `deletionScheduledAt` exposé sur chaque candidature.
- Module `application-retention/` : store (avertissements réclamés par l'update qui les marque ; suppression en une transaction, re-vérifiée : candidature, sessions d'entretien et leurs morceaux, notifications liées, correspondance détachée ; versions en cascade), service quotidien (au démarrage puis toutes les 24 h, seulement après une première passe manuelle), `POST /applications/:id/keep`, script `applications:purge [--dry-run]` qui refuse la première passe tant que la politique publiée ne contient pas « un an après leur dernière modification ».
- Avertissement : une notification dans l'app par candidat (toujours) et un e-mail groupé (`mail/application-deletion-email.ts`, gabarit commun), désactivable dans `/notifications`. Les préférences enregistrées avant ce réglage sont complétées par les défauts (`readEmailPreferences`).
- Web : bandeau « vont être supprimées » sur `/candidatures` (Garder, ouvrir pour télécharger), interrupteur dans `/notifications`, note dans le cockpit (Usage) sur la baisse des chiffres de plus d'un an.
- `privacy-retention-policy.ts` : règles candidatures (un an) et offres (30 jours, US-169).
- Refactor : helpers de `NotificationsService` sortis dans `notification-builders.ts` (fichier passé à 419 lignes).

**Vérification** : tsc et eslint OK (API, web). Tests API 2 207, web 393. Base locale (vrai Postgres) : dry-run 0/0 aujourd'hui ; horloge avancée de deux ans dans une transaction annulée : 9 candidatures averties puis supprimées, 21 sessions d'entretien, 4 notifications, 1 correspondance détachée.
**Non fait** : publication de la politique de confidentialité (`/admin/legal`), action du propriétaire. **Non vérifié** : écrans dans un navigateur, e-mail reçu.
