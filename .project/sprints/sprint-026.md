<!-- generated-by: demande propriétaire 2026-09-23 (ajout des API entreprises au droit de la clé France Travail) -->

# Sprint 026 — Les entreprises qui recrutent

## 🎯 Sprint Goal

Épic **E20 — Entreprises**. Exploiter les deux API France Travail que le propriétaire a ajoutées
aux droits de notre clé le 2026-09-23 : **La Bonne Boîte** et **Synthèse Pages employeurs**.

Elles ne donnent **pas d'offres**. Elles donnent des **entreprises** : celles qui embauchent dans un
métier, près d'un lieu, même sans annonce publiée. C'est une matière différente de celle du sprint
025, et elle ouvre trois usages distincts — dont un qui est une fonctionnalité à part entière pour
le candidat.

> ⚠️ Absent de `.project/vision.md`, comme E19. À reporter par le Product Owner, jamais en
> auto-édition (hard rule).

---

## ⚠️ À vérifier avant d'écrire la moindre ligne

Le catalogue de francetravail.io est entièrement rendu en JavaScript : ni `WebFetch` ni l'extraction
de texte du navigateur n'ont pu en lire la documentation le 2026-09-23. **Rien de ce qui suit sur
les contrats d'API ne doit être considéré comme acquis.** À confirmer, en direct, avec la clé :

1. **Chemins et versions exacts.** Une recherche donne `GET /partenaire/labonneboite/v1/company/`
   pour la v1, et une v2 existe (`bonne-boite-v2` dans le catalogue). Vérifier laquelle est servie
   à notre application, et si la v1 est dépréciée.
2. **Scopes OAuth** à ajouter à ceux déjà demandés (`api_offresdemploiv2 o2dsoffre`). Chaque API a
   les siens ; un scope non accordé se manifeste par `invalid_scope` au moment du jeton.
3. **Paramètres** : `rome_codes`, `latitude`, `longitude`, `distance` sont attestés pour La Bonne
   Boîte. Vérifier les bornes (rayon maximal, nombre de résultats, pagination).
4. **Champs de réponse** : `siret`, `name`, `naf`, `headcount`, `city`, coordonnées sont attestés.
   **Vérifier en priorité s'il existe une URL de site web** — c'est ce qui conditionne l'usage n°2
   ci-dessous. Rien n'indique aujourd'hui qu'elle existe.
5. **Quotas**, comme pour Offres d'emploi (4 appels/seconde par application pour celle-ci).
6. **Licence de réutilisation et mention obligatoire**, à traiter comme pour Offres d'emploi.
7. Ce que **Synthèse Pages employeurs** renvoie réellement : à ce jour, aucune information fiable.

Méthode qui a fonctionné pour Offres d'emploi : interroger les référentiels et compter les
résultats d'appels réels plutôt que se fier aux guides tiers. Un code faux ne lève pas d'erreur, il
renvoie une page vide.

---

## Les trois usages retenus par le propriétaire

### 1. Une rubrique « Entreprises qui recrutent » (fonctionnalité candidat)

Montrer au candidat les entreprises qui embauchent dans son métier près de chez lui, **même sans
annonce publiée**, et l'aider à faire une candidature spontanée avec CVForge.

- L'entrée existe déjà côté profil : `search_projects.targetRoles` et `locations` (code INSEE,
  latitude, longitude, rayon) donnent exactement ce que l'API attend. Il manque le **code ROME** :
  `targetRoles` prévoit un ROME optionnel qui n'est jamais renseigné aujourd'hui. Décider comment
  l'obtenir — saisie assistée, référentiel ROME de France Travail, ou déduction depuis l'intitulé.
- Réutiliser le flux de candidature existant : une candidature spontanée est une candidature sans
  `offerUrl`, avec l'entreprise pour seul contexte. Vérifier ce que `applications.service.ts`
  accepte aujourd'hui, et ce que la génération de CV fait sans texte d'offre.
- Question produit ouverte : cette rubrique est-elle gratuite, ou la génération pour une
  candidature spontanée coûte-t-elle un crédit comme les autres ?

### 2. Alimenter le registre des logiciels de recrutement

La chaîne : `siret` → site web de l'entreprise (API Recherche d'entreprises, gratuite, déjà
identifiée dans le plan E19 §3c) → page carrière → `detectAtsBoard(url)`.

> **Réserve à lever avant d'industrialiser.** Le rendement est inconnu et probablement faible :
> beaucoup d'entreprises n'utilisent aucun logiciel reconnu, et trouver la page carrière depuis la
> page d'accueil suppose de récupérer le HTML du site, ce que la découverte Common Crawl avait
> justement été choisie pour éviter.
>
> **Mesurer d'abord** : prendre un échantillon de 100 entreprises rendues par La Bonne Boîte, faire
> passer la chaîne à la main, compter combien aboutissent à un jeton valide. Décider ensuite.
> Un taux inférieur à 10 % ne justifie pas le code.

### 3. Enrichir la fiche entreprise

Ce que le plan E19 §3c prévoyait en V1.1 : table `companies`, rattachement au SIREN, effectif,
secteur (NAF), et les indicateurs RSE de l'API Recherche d'entreprises (société à mission, ESS,
index Egapro, bilan GES). Les Pages employeurs complètent cette fiche avec ce que France Travail
publie côté employeur.

---

## 🧱 Socle ajouté le 2026-09-23 (plan « API France Travail », voir ADR-024)

Le code ROME est le chaînon qui manque à presque tout ce qui suit :
- La Bonne Boîte l'exige.
- La bonne alternance ne sait chercher que par ROME ou par département ; aujourd'hui, faute de ROME, elle filtre au département.
- Offres d'emploi v2 accepte `codeROME`.
- L'API Marché du travail est indexée par ROME (sprint 027).

Deux stories fondatrices passent donc **avant** le backlog ci-dessous. Elles sont numérotées à la suite pour ne rien renuméroter.

> Correction de lecture : l'US-118 affirmait que `targetRoles` « prévoit un ROME optionnel ». Ce
> n'est pas le cas : `targetRoles` est un `string[]` (`packages/types/src/search-project.ts`). Le
> ROME est à ajouter entièrement.

- [x] **[US-122]** Couche commune France Travail — `apps/api/src/france-travail/`
  - Agent: `developer`
  - Pourquoi : le jeton OAuth vit aujourd'hui dans `france-travail.source.ts`, avec un scope fixe
    (`api_offresdemploiv2 o2dsoffre`). La Bonne Boîte, Pages employeurs, ROMEO et ROME passent par
    la **même clé**, mais chacun a son scope. France Travail refuse tout le jeton (`invalid_scope`)
    dès qu'un seul des scopes demandés n'est pas souscrit. Un jeton unique pour tous les scopes
    ferait donc tomber toutes les API à cause d'une seule souscription manquante.
  - Critères d'acceptation :
    - [x] `ft.config.ts` : catalogue `FT_APIS` avec, pour chaque API, l'URL de base, le scope et un
          débit surchargeable par variable d'environnement.
    - [x] `ft-token.service.ts` : un jeton **par scope**, rafraîchi 60 s avant son expiration. Des
          demandes simultanées pour un même scope partagent une seule requête en cours. Le détail de
          `invalid_scope` est conservé dans l'erreur.
    - [x] `ft-http.client.ts` : un `SourceRateLimiter` par API, déplacé vers
          `apps/api/src/shared/rate-limit/` (l'ancien chemin le réexporte). Les codes 204, 206, 429
          et `Retry-After` sont traités comme aujourd'hui. Le client renvoie un `FtResult` typé :
          ok, vide ou indisponible.
    - [x] Une API non souscrite est **inerte** : aucun appel, un avertissement au démarrage, pas
          d'erreur.
    - [x] `FranceTravailSource` est migrée sur le client. Elle ne garde que la pagination et le
          mapping, et ses tests existants restent verts.
    - [x] `ft:smoke <api>` : un jeton et un appel de lecture par API. Le script affiche le statut et
          les premières clés de la réponse.
  - Prérequis de US-116 et US-119.
  - **Livré le 2026-09-23** ([[workflows/runs/developer-20260923225823]]). Choix faits en route :
    - l'activation passe par `FRANCE_TRAVAIL_APIS` (défaut : `offres`), branchée dans compose et
      Terraform ; scope et débit se surchargent par API (`FRANCE_TRAVAIL_<ID>_SCOPE`,
      `_REQUESTS_PER_SECOND`) ;
    - un `invalid_scope` au jeton ou un 403 à l'appel éteint l'API jusqu'au redémarrage, sans
      toucher aux autres ;
    - un seul client par processus (`FranceTravailModule`), et une seule liste d'adaptateurs
      partagée par la collecte et les vérifications : avant, chaque service construisait la sienne
      et avait son propre jeton ;
    - l'ancien contrôle détaillé des offres s'appelle désormais `ft:smoke:offres`.
- [ ] **[US-123]** Référentiel ROME 4.0 local et substitutions — `apps/api/src/rome/`
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Migration `0028` : tables `rome_metiers`, `rome_appellations` (avec un libellé sans
          accents pour l'autocomplétion), `rome_competences` (savoir, savoir-faire, savoir-être),
          `rome_metier_competences`, `rome_substitutions` et `rome_sync_runs`.
    - [ ] `rome:sync` (plus sa variante `:built`) copie Métiers, Appellations et Compétences. On
          peut le relancer sans effet de bord. Le verrou est en base, sur le modèle de
          `job_digest_runs`. Un échec laisse le référentiel précédent intact. Rythme : une fois par
          semaine.
    - [ ] L'API Substitutions d'entités réécrit chaque code périmé partout où il est stocké, supprime
          les doublons que cela crée et journalise ce qu'elle a fait.
    - [ ] Source ROME citée : ROME 4.0 est une donnée France Travail.

## 📋 Backlog

- [ ] **[US-116]** Vérifier les deux API en direct et consigner leurs contrats réels (§ « À
      vérifier »). Livrable : une note dans ce fichier, pas du code.
- [ ] **[US-117]** Mesurer le rendement de la chaîne SIRET → site → page carrière → ATS sur un
      échantillon de 100 entreprises. Livrable : un chiffre et une décision.
- [ ] **[US-118]** Le code ROME dans le projet de recherche (saisie et stockage).
  - *Précisé le 2026-09-23* : la question « comment l'obtenir » est tranchée par ADR-024.
    - [ ] Enregistrer le projet (et seulement ce moment-là, jamais l'affichage) appelle ROMEO v2
          `predictionMetiers` sur `targetRoles` et le titre du CV. Les 5 meilleures appellations
          sont proposées avec leur score.
    - [ ] Sur `/ma-recherche`, le candidat les confirme ou les retire, sous forme de puces. En
          repli, il peut en ajouter une par autocomplétion sur `rome_appellations`, en local.
    - [ ] Stockage dans une table annexe `search_project_rome` (migration `0029`), sans clé
          étrangère. Surtout pas dans `profiles` : `PgProfilesStore.save` supprime puis réinsère
          toutes les lignes.
    - [ ] Si ROMEO est indisponible ou non souscrite, le projet s'enregistre quand même, sans
          suggestion.
    - [ ] La purge RGPD couvre `search_project_rome`.
- [ ] **[US-119]** `LaBonneBoiteSource` et la rubrique « Entreprises qui recrutent ».
- [ ] **[US-120]** Candidature spontanée depuis une entreprise.
- [ ] **[US-121]** Table `companies`, rattachement au SIREN, fiche entreprise et badges RSE.

## 🔗 Dépendances

- Le propriétaire doit avoir souscrit les deux API sur son application francetravail.io. Une API
  non souscrite authentifie mais refuse tous les appels — c'est ce qui a coûté une demi-journée sur
  Offres d'emploi.
- Aucune variable nouvelle : les deux API passent par la même clé que Offres d'emploi.
- **Ordre** : US-122, puis US-123, puis US-118. Ensuite US-116, US-119, US-120, US-121 et US-117,
  cette dernière en mesure parallèle.
- **API supplémentaires à souscrire** pour le socle : ROMEO v2 et ROME 4.0 (Métiers, Compétences,
  Fiches métiers, Contextes de travail, Substitutions d'entités).
- ✅ **Vérifié en direct le 2026-09-23 avec `ft:smoke all`** :
  - ROMEO v2 (`api_romeov2`, `POST romeo/v2/predictionMetiers`) exige `options.nomAppelant`
    (400 `J072000G` sinon). Il accepte **plusieurs textes par appel** et respecte `nbResultats`.
    Chaque proposition porte `codeAppellation`, `libelleAppellation`, `codeRome`, `libelleRome` et
    `scorePrediction`.
  - ROME 4.0 (`api_rome-<api>v1 nomenclatureRome`) : `metiers/metier` renvoie 1 911 entrées
    `{code, libelle}` ; `competences/competence` 35 595 `{type, code, libelle}` ;
    `fiches-rome/fiche-metier/<code>` renvoie groupes de compétences et savoirs.
  - **La Bonne Boîte v2** : le jeton `api_labonneboitev2` est délivré, puis chaque appel répond
    **403 « Invalid scope »**. La souscription ne suffit pas, l'accès doit être accordé à la main par
    France Travail. Cela bloque US-119.
  - Encore inconnus : les quotas des API ROME et ROMEO (1 appel/s par défaut, surchargeable), et
    les API Contextes de travail et Substitutions d'entités, absentes du catalogue `FT_APIS` tant
    qu'elles ne sont pas vérifiées.

## 🔭 Suite prévue

- **Sprint 027 — E21 Matching ROME et radar** (`sprint-027.md`) : collecte interrogée par ROME,
  score par compétences et « pourquoi cette offre », radar Marché du travail.
- **Sprint 028 — E22 Alternance et événements** (`sprint-028.md`) : envoi de candidature en
  alternance, et salons ou job datings dans le digest.

## 🔁 Workflow Runs

- 2026-09-23 — [[workflows/runs/developer-20260923225823|developer]] (US-122) — passed
