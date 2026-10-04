<!-- generated-by: plan « Durées de conservation » (demande propriétaire 2026-09-28) -->

# Sprint 035 — Ne garder que ce qui sert

## 🎯 Sprint Goal

Épic **E28 — Durées de conservation des offres et des candidatures**. Aujourd'hui, rien n'est
jamais supprimé : une offre fermée garde son `closed_at` et sa réponse brute (`job_listings.raw`),
**coordonnées du recruteur comprises** (141 offres France Travail sur 2 722 en base locale portent
un e-mail de recruteur), et une candidature vit aussi longtemps que le compte. À l'issue du sprint :

- une offre est anonymisée dès sa fermeture, puis supprimée après 30 jours, sauf si une
  candidature active s'y rattache ;
- une candidature sans activité depuis un an est supprimée, après un avertissement ;
- la politique de confidentialité annonce ces durées.

Indépendant d'E27 : **à livrer avant le sprint 034**. Le flux continu d'E27 fera entrer beaucoup
plus d'offres en base, et la purge doit exister avant.

> ⚠️ **Licence de réutilisation des offres France Travail** : le contenu d'une offre supprimée
> qu'on conserve doit être anonymisé (nom, description et URL de l'entreprise, personne à
> contacter, téléphone), et les coordonnées des recruteurs ne servent à aucun usage commercial
> (art. 8). Vérifié le 2026-09-28 : le module `leads` et les modules entreprises ne réutilisent
> aucune coordonnée de recruteur ; seule la fiche d'offre les montre au candidat, pour postuler.

## 📅 Period

- Start: à planifier, avant le sprint 034
- End: —

## ✅ Tasks (3–8 max)

- [x] **[US-169]** Anonymiser les offres fermées et purger les offres de plus de 30 jours
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] **Anonymisation à la fermeture** : quand une annonce passe `closed_at`, son `raw` perd le
          contact (`contact.*` : nom, courriel, coordonnées, téléphone) et les champs d'entreprise
          (nom, description, URL, logo) ; les mêmes champs sont vidés dans `jobs` si toutes ses
          annonces sont fermées. Couvert par un test sur une réponse France Travail réelle
          (fixture) et une annonce de logiciel de recrutement.
    - [x] **Purge quotidienne** (même verrou que `job_digest_runs`) : une offre (`jobs`) est
          supprimée, avec ses annonces, liens et correspondances en cascade, quand **sa date de
          publication (ou, à défaut, de première détection) dépasse 30 jours**, ou quand elle est
          fermée depuis plus de 30 jours,
          **sauf** si une correspondance la relie à une candidature **active** (brouillon, envoyée,
          entretien prévu), via `job_matches.application_id`.
    - [x] Une offre conservée pour une candidature active est anonymisée à sa fermeture comme les
          autres, puis purgée au premier passage où la candidature n'est plus active (refusée,
          offre reçue, supprimée).
    - [x] Une candidature ne dépend pas de l'offre purgée : elle garde sa propre copie
          (`raw_offer_text`, `extracted`). Vérifié par un test : la page candidature, la
          génération du CV et de la lettre, et l'entretien fonctionnent après la purge de l'offre.
          _Vérifié : test PGlite (la candidature relue par son store après la purge est entière) ;
          aucun module candidature, génération ou entretien ne lit `jobs` ni `job_matches`._
    - [x] **Rattrapage une seule fois** : les annonces déjà fermées sont anonymisées et les offres
          de plus de 30 jours purgées, par un script relançable (`jobs:purge --dry-run` pour
          compter avant d'agir).
          _La purge quotidienne ne démarre qu'après une première purge lancée à la main
          (`jobs:purge`), une fois le `--dry-run` relu (DoD). Base locale le 2026-10-04 : 4
          annonces à anonymiser, 376 offres sur 3 050 à purger, aucune gardée._
    - [x] Le nombre d'offres anonymisées et purgées par passage est journalisé et visible dans
          l'admin des sources.
    - [x] La fenêtre de 30 jours est une constante partagée avec la règle de fraîcheur d'E19
          (aucune offre de plus de 30 jours proposée), pas un second chiffre.
- [ ] **[US-170]** Supprimer les candidatures sans activité depuis un an
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Une candidature dont la **dernière modification** (`updated_at`) date de plus d'un an est
          supprimée, quel que soit son statut : versions de CV et de lettre (cascade existante),
          sessions et rapports d'entretien rattachés, fichiers stockés s'il y en a, correspondance
          d'offre détachée.
    - [ ] Une ouverture de la candidature ne compte pas comme une activité ; un changement de
          statut, une génération ou une modification, si.
    - [ ] **Avertissement 15 jours avant**, par e-mail (gabarit commun, US-161) et dans l'app :
          liste des candidatures concernées, avec un lien pour les garder (toute modification repousse
          l'échéance) ou télécharger leurs documents. Désactivable dans `/notifications` comme les
          autres e-mails, sauf qu'on ne peut pas désactiver la suppression elle-même.
    - [ ] Tâche quotidienne sur le modèle d'`AtsPurgeService` (au démarrage du module, puis toutes
          les 24 h), avec un mode `--dry-run`.
    - [ ] Les métriques admin qui comptent les candidatures (cockpit E26, KPI) restent justes :
          les agrégats historiques ne sont pas recalculés à partir des lignes supprimées, ou la
          baisse est documentée dans le cockpit.
    - [ ] `privacy-retention-policy.ts` porte les deux nouvelles règles (offres 30 jours,
          candidatures un an après la dernière activité).
    - [ ] Politique de confidentialité mise à jour depuis `/admin/legal`, section « Combien de
          temps nous les gardons » : « Vos candidatures : un an après leur dernière modification,
          avec un rappel quinze jours avant. » **Publiée avant l'activation de la purge.**
    - [ ] Tests : seuil d'un an, avertissement envoyé une seule fois, candidature modifiée après
          l'avertissement conservée, suppression complète (aucune ligne restante dans les tables
          liées).

## 📊 Sprint DoD

- [ ] `--dry-run` lancé en staging puis en prod, chiffres relus par le propriétaire avant la
      première vraie purge.
- [ ] `pnpm lint` et `pnpm test` verts.
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Suppression irréversible** : une erreur de requête efface des candidatures en cours. D'où le
  `--dry-run` obligatoire avant la première exécution, et des tests qui vérifient ce qui est
  **conservé**, pas seulement ce qui est supprimé.
- **Sauvegardes** : une candidature supprimée survit dans les sauvegardes de la base jusqu'à leur
  rotation. À mentionner dans la politique de confidentialité si la rotation dépasse quelques
  semaines.

## ⚠️ To Clarify

- **« Plus d'un an »** : compté depuis la **dernière modification** et non la création, pour ne
  pas supprimer une candidature encore suivie. Proposition à confirmer par le propriétaire.
- **Candidature avec une offre d'emploi reçue** : la supprimer aussi au bout d'un an sans
  activité ? Proposition : oui, la règle est la même pour tous les statuts, et l'avertissement
  laisse le temps de télécharger les documents.

## 🔁 Workflow Runs

- 2026-10-04 — [[workflows/runs/developer-20261004122902|developer]] (US-169) — passed
