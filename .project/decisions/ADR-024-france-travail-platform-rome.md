# ADR-024 — Une plateforme France Travail, et le ROME comme langue commune

- Statut : proposé
- Date : 2026-09-23
- Portée : `apps/api/src/france-travail` (nouveau), `apps/api/src/rome` (nouveau),
  `apps/api/src/job-search`, `apps/api/src/search-projects`. Épics E20 à E22, sprints 026 à 028.

## Context

La clé francetravail.io de CVForge (application « cvspark ») sert d'abord à Offres d'emploi v2 (E19,
ADR-023). Le propriétaire lui a ajouté La Bonne Boîte et Synthèse Pages employeurs (sprint 026). Le
catalogue compte une quarantaine d'API gratuites, dont plusieurs changent la nature du produit :
- **ROMEO v2** : une IA qui rapproche un texte libre des appellations et compétences du ROME ;
- **ROME 4.0** : métiers, compétences, fiches, contextes de travail, et substitutions d'entités ;
- **Marché du travail** : tension, volumes et salaires par métier et par territoire ;
- **Mes évènements emploi**.

Deux constats imposent une décision d'architecture avant d'en brancher une seule de plus.

1. **Le jeton est aujourd'hui propre à une source.** `france-travail.source.ts` le demande avec un
   scope fixe. Chaque API a son scope. France Travail refuse **tout** le jeton (`invalid_scope`) dès
   qu'un seul scope demandé n'est pas souscrit. Mettre tous les scopes dans une seule demande ferait
   tomber toutes les API pour une souscription manquante.
2. **Ces API ne se parlent qu'en codes ROME** : La Bonne Boîte, Marché du travail, La bonne
   alternance (hors France Travail, mais même référentiel), et le filtre `codeROME` d'Offres v2.
   Or aucun code ROME n'existe dans CVForge : le projet de recherche ne porte que des intitulés
   libres (`targetRoles: string[]`), et le score compare des sous-chaînes.

## Decision

### 1. Une couche commune pour toutes les API France Travail

`apps/api/src/france-travail/` expose un client unique. Les sources et les services métier ne
parlent plus OAuth.

- **Un jeton par scope**, mis en cache jusqu'à 60 s avant son expiration. Des demandes simultanées
  pour un même scope partagent une seule requête en cours.
- **Un limiteur par API.** Les quotas sont propres à chaque API, et l'une ne doit pas consommer le
  débit d'une autre. La demande de jeton passe par son propre limiteur.
- **Une API non souscrite est inerte**, comme l'est aujourd'hui une source sans identifiants : pas
  d'appel, pas d'erreur, un avertissement au démarrage.
- **`ft:smoke <api>` est le seul juge des contrats.** Le catalogue est rendu en JavaScript et n'a
  pas pu être lu. On ne code aucun chemin, scope ni paramètre sans l'avoir compté sur de vrais
  appels, comme pour Offres v2, dont trois codes supposés se sont révélés faux.

### 2. Le ROME comme pivot entre candidat, offre, entreprise et marché

- **Référentiel copié en local** (`rome_*`) et synchronisé chaque semaine. L'autocomplétion, le
  score et les jointures ne coûtent donc aucun appel.
- **Substitutions d'entités** : chaque code périmé est réécrit partout où il est stocké. Sans cela,
  un code supprimé du ROME ferait disparaître en silence les offres d'un candidat.
- **ROMEO est appelé à l'enregistrement, jamais à l'affichage** : à l'enregistrement du projet de
  recherche, et quand l'empreinte du CV change pour les compétences. C'est la règle de l'ADR-023
  étendue à l'inférence.
- **Le candidat confirme toujours.** ROMEO propose des appellations ; seules les appellations
  confirmées pilotent la collecte et le score. Une erreur de l'IA ne doit pas décider seule de ce
  qu'un candidat reçoit.
- **Les données ROME ne vont pas dans `profiles`** : `PgProfilesStore.save` supprime puis réinsère
  toutes les lignes. Elles vont dans des tables annexes indexées par `(user_email, profile_id)`, sans
  clé étrangère, comme `search_projects`.

### 3. Aucun crédit pour les données France Travail

Les données France Travail sont gratuites pour nous. Le matching par métier, l'explication d'une
correspondance, le radar marché et les fiches entreprises restent donc gratuits (ADR-012) : ce sont
des arguments d'acquisition. Les crédits ne sont consommés que là où un LLM tourne, comme
aujourd'hui : CV, lettre, tri par IA.

### 4. La source est citée partout

Chaque donnée issue de France Travail est signalée comme telle : offres, ROME, statistiques,
entreprises. C'est la condition de la licence de réutilisation, déjà appliquée aux offres
(ADR-023).

## Consequences

- `france-travail.source.ts` perd son code OAuth et son limiteur privé. Ses tests passent derrière
  un faux client. C'est le seul refactor imposé à du code existant.
- Deux cycles de synchronisation s'ajoutent à la collecte du matin : `rome:sync` chaque semaine et
  les substitutions. Ils suivent le même modèle de verrou en base (`job_digest_runs`).
- Tant qu'aucune appellation n'est confirmée, la collecte retombe sur les mots-clés. Le produit
  n'est jamais moins bon qu'aujourd'hui, seulement meilleur quand le ROME est présent.
- Chaque API supplémentaire est une souscription à faire par le propriétaire sur francetravail.io.
  Ni le code ni un agent ne la font à sa place, car il faut accepter des CGU.
- Risque ouvert : on ne connaît pas encore la qualité de ROMEO sur des intitulés courts ou très
  spécialisés. La confirmation par le candidat le couvre, sans le mesurer. À mesurer dès les
  premiers appels réels.
