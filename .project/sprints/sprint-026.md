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
- [x] **[US-123]** Référentiel ROME 4.0 local et substitutions — `apps/api/src/rome/`
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Migration `0028` : tables `rome_metiers`, `rome_appellations` (avec un libellé sans
          accents pour l'autocomplétion), `rome_competences` (savoir, savoir-faire, savoir-être),
          `rome_metier_competences`, `rome_substitutions` et `rome_sync_runs`.
    - [x] `rome:sync` (plus sa variante `:built`) copie Métiers, Appellations et Compétences. On
          peut le relancer sans effet de bord. Le verrou est en base, sur le modèle de
          `job_digest_runs`. Un échec laisse le référentiel précédent intact. Rythme : une fois par
          semaine.
    - [x] L'API Substitutions d'entités réécrit chaque code périmé partout où il est stocké, supprime
          les doublons que cela crée et journalise ce qu'elle a fait.
    - [x] Source ROME citée : ROME 4.0 est une donnée France Travail.
  - **État au 2026-09-23** ([[workflows/runs/developer-20260923232118]]) : trois critères sur quatre
    tenus, la story reste ouverte pour les substitutions.
    - Synchro réelle : 1 911 métiers, 14 301 appellations, 35 595 compétences et 106 792 liens, en
      **trois appels** (paramètre `champs`) et environ 10 s. Rejouée trois fois : même contenu,
      une ligne de plus dans `rome_sync_runs`. Refus si le téléchargement perd plus d'un dixième.
    - Source citée : `romeAttribution()` (« Source : ROME 4.0, France Travail (version 61) »), et
      la version est gardée dans les statistiques de chaque synchro. L'affichage viendra avec US-118.
    - Substitutions : la table, le moteur de réécriture (réécrit, supprime les doublons,
      journalise dans `applied_stats`) et le relevé des codes disparus sont faits et testés.
      **Reste bloqué** : l'API elle-même. Le jeton `api_rome-substitutionsv1 nomenclatureRome`
      est délivré, mais `/partenaire/rome-substitutions/v1/*` répond 403, comme La Bonne Boîte.
      L'adaptateur ne sera écrit qu'une fois la réponse réelle lue. D'ici là, un code retiré est
      signalé dans `retired`, jamais supprimé chez l'utilisateur.
    - Aucune table utilisateur ne stocke encore de code ROME : `ROME_CODE_HOLDERS` est vide, et
      US-118 y déclarera `search_project_rome`.
  - **Clos le 2026-09-24** ([[workflows/runs/developer-20260924124500]]) : le 403 venait des chemins.
    `GET /substitution/{TYPE}/{code}` (un appel par code, 404 = pas de successeur). Chaque
    `rome:sync` demande un successeur pour chaque code encore stocké chez un utilisateur et absent du
    nouveau référentiel. Vérifié en direct : 500015 → 507259, une ligne réécrite.

## 📋 Backlog

- [ ] **[US-116]** Vérifier les deux API en direct et consigner leurs contrats réels (§ « À
      vérifier »). Livrable : une note dans ce fichier, pas du code.
  - **La Bonne Boîte v2, vérifiée en direct le 2026-09-24** (chemins donnés par le support,
    INC2741452) :
    - Scope `api_labonneboitev2 search office`, `GET /partenaire/labonneboite/v2/recherche`. La v1
      n'est pas servie à notre application.
    - Paramètres :
      - `rome` est répétable (`rome=M1805&rome=M1855`) ; la forme `rome=A,B` rend 0 résultat ;
      - un lieu est obligatoire (422 sinon) : `citycode` (INSEE), `latitude` + `longitude`,
        `department_number` (le numéro, car `department=44` rend 0), `postcode`, `city` ou `region` ;
      - `distance` en km, 200 au plus (422 au-delà) ;
      - `page` et `page_size` (100 au plus, 10 par défaut) ;
      - `naf` pour filtrer ;
      - tri par défaut `sort_by=hiring_potential`, `sort_direction=desc`.
    - Réponse : `{hits, items, params, resolved_params}`. Un code ROME inconnu rend 0 résultat, pas
      une erreur. Chaque élément contient `siret`, `company_name`, `office_name`, `naf`, `naf_label`,
      `headcount_min`, `headcount_max`, `location{lat,lon}`, `city`, `citycode`, `postcode`,
      `department`, `department_number`, `region`, `hiring_potential`, `is_high_potential`, `rome`,
      `id`, et `email` (« yes » ou « no », sans l'adresse elle-même).
    - **Aucune URL de site web** : l'usage n°2 passe forcément par la Recherche d'entreprises (US-117).
    - Débit annoncé dans les en-têtes : 2 appels par seconde par application (réserve de 2).
    - Volumes : M1805 à Nantes, 47 entreprises dans la commune et 95 dans un rayon de 50 km.
    - Licence et mention obligatoire : non relues. Nous citons « La Bonne Boîte, France Travail »
      comme pour les autres données France Travail (ADR-024 §4).
  - **Synthèse Pages employeurs, en partie seulement** : le scope `api_synthese-pages-employeursv1`
    délivre un jeton, et la racine `/partenaire/synthese-pages-employeurs/v1` existe (403 ; une
    racine inventée répond 401). Tous les chemins essayés répondent 403, comme La Bonne Boîte
    avant que le support ne donne les siens. **À demander au support**, puis finir cette story.
- [ ] **[US-117]** Mesurer le rendement de la chaîne SIRET → site → page carrière → ATS sur un
      échantillon de 100 entreprises. Livrable : un chiffre et une décision.
- [x] **[US-118]** Le code ROME dans le projet de recherche (saisie et stockage).
  - *Précisé le 2026-09-23* : la question « comment l'obtenir » est tranchée par ADR-024.
    - [x] Enregistrer le projet (et seulement ce moment-là, jamais l'affichage) appelle ROMEO v2
          `predictionMetiers` sur `targetRoles` et le titre du CV. Les 5 meilleures appellations
          sont proposées avec leur score.
    - [x] Sur `/ma-recherche`, le candidat les confirme ou les retire, sous forme de puces. En
          repli, il peut en ajouter une par autocomplétion sur `rome_appellations`, en local.
    - [x] Stockage dans une table annexe `search_project_rome` (migration `0029`), sans clé
          étrangère. Surtout pas dans `profiles` : `PgProfilesStore.save` supprime puis réinsère
          toutes les lignes.
    - [x] Si ROMEO est indisponible ou non souscrite, le projet s'enregistre quand même, sans
          suggestion.
    - [x] La purge RGPD couvre `search_project_rome`.
  - **Livré le 2026-09-24** ([[workflows/runs/analyze-design-dev-review-20260923233426]]). Vérifié en réel sur le compte local :
    enregistrer, confirmer, écarter, autocomplétion. Deux corrections trouvées en testant :
    - les suggestions sont prises tour à tour entre les textes : au seul score, le titre du CV
      prenait les cinq places ;
    - le champ « Postes visés » avalait espaces et retours à la ligne pendant la frappe (défaut
      antérieur).
    - Reste : exporter les appellations dans l'export RGPD.
- [x] **[US-119]** `LaBonneBoiteSource` et la rubrique « Entreprises qui recrutent ».
  - Agent: `developer`
  - Critères d'acceptation *(précisés le 2026-09-24, d'après l'usage n°1 et le contrat de US-116)* :
    - [x] `LaBonneBoiteSource` interroge `/recherche` par code ROME confirmé et par lieu de la
          recherche : commune INSEE et rayon (200 km au plus), coordonnées à défaut, département en
          dernier recours. 100 entreprises au plus par requête.
    - [x] Copie locale (migration `0036`), relue chaque semaine en tâche de fond, jamais pendant
          l'affichage. Un appel en échec garde la copie précédente.
    - [x] Page « Entreprises qui recrutent » dans la navigation : les entreprises des métiers et des
          lieux de la recherche, sans doublon, triées par potentiel d'embauche, avec secteur, ville,
          effectif et métier. Le fort potentiel est signalé.
    - [x] Source citée (« La Bonne Boîte, France Travail ») et gratuité (ADR-024 §3). Un état vide
          explique quoi faire : confirmer un métier, ajouter un lieu, ou attendre la première lecture.
    - Hors périmètre : la candidature spontanée (US-120) et la fiche entreprise (US-121).
  - **Livré le 2026-09-24** ([[workflows/runs/developer-20260924130000]]) : page `/entreprises`,
    migration 0036, relecture hebdomadaire, `hiring-companies:refresh`. Vérifié en réel : Nantes à
    30 km, métiers Comptable et Développeur web, 100 entreprises sans doublon.
- [x] **[US-120]** Candidature spontanée depuis une entreprise.
  - Agent: `developer`
  - Critères d'acceptation *(précisés le 2026-09-24)* :
    - [x] Depuis « Entreprises qui recrutent », un bouton crée une candidature sans offre, rattachée
          au profil de la recherche, et y mène. Un deuxième clic rouvre la même candidature.
    - [x] Création gratuite et sans appel au modèle (ADR-024 §3) ; le CV et la lettre coûtent les
          crédits habituels. Cela tranche la question ouverte de l'usage n°1.
    - [x] La génération sait qu'il n'y a pas d'offre : le CV cible le métier, et la lettre ne parle
          d'aucune annonce (objet « Candidature spontanée — <métier> »).
    - [x] Seule une entreprise de la liste du candidat est acceptée.
  - **Livré le 2026-09-24** ([[workflows/runs/developer-20260924140000]]). Création vérifiée en réel ;
    générer une lettre sur une candidature spontanée reste à relire à la main (1 crédit).
- [x] **[US-121]** Table `companies`, rattachement au SIREN, fiche entreprise et badges RSE.
  - Agent: `developer`
  - Contrat vérifié en direct le 2026-09-24 :
    - API Recherche d'entreprises : `GET recherche-entreprises.api.gouv.fr/search?q=<siren>`,
      publique et sans clé, 7 appels/s au plus.
      - Elle donne `siren`, `nom_raison_sociale`, `activite_principale`, `categorie_entreprise`,
        `tranche_effectif_salarie`, `date_creation`, `nombre_etablissements_ouverts`,
        `finances.<année>` et `etat_administratif`.
      - Dans `complements` : `est_societe_mission`, `est_ess`, `est_siae`, `bilan_ges_renseigne`
        et `egapro_renseignee`.
      - **Aucune URL de site web.**
    - API Egapro : `GET egapro.travail.gouv.fr/api/search?q=<siren>` donne `notes.<année>`, sur 100.
  - Critères d'acceptation *(précisés le 2026-09-24)* :
    - [x] Migration 0037 : table `companies` indexée par SIREN, qui ne contient que des données
          publiques. Les dirigeants ne sont pas copiés, car ce sont des données personnelles.
    - [x] Chaque établissement de La Bonne Boîte est rattaché à son SIREN, soit les 9 premiers
          chiffres du SIRET. Sa fiche est lue en arrière-plan, jamais à l'affichage :
          - relue tous les 30 jours ;
          - au plus 100 lectures par passage horaire ;
          - Egapro n'est appelé que si l'index est déclaré ;
          - une entreprise introuvable est notée comme telle, pour ne pas la redemander à chaque heure.
    - [x] Chaque carte de « Entreprises qui recrutent » affiche ses badges : société à mission, ESS,
          entreprise inclusive, bilan GES publié, et index Egapro avec sa note.
    - [x] Une fiche entreprise `/entreprises/<siret>` réunit l'établissement (La Bonne Boîte),
          l'entreprise (catégorie, effectif, création, établissements, chiffre d'affaires) et ses
          engagements, avec le bouton de candidature spontanée.
          - Seule une entreprise de la liste du candidat s'ouvre.
          - Chaque source est citée.
    - [x] Pages employeurs n'est pas ajoutée à la fiche tant que US-116 attend le support.
  - **Livré le 2026-09-24** ([[workflows/runs/developer-20260924150000]]). Vérifié en réel : 178 SIREN lus, 64 des 100 cartes de Nantes badgées.
    - Hors périmètre : les offres d'emploi rattachées au SIREN.

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
- 2026-09-23 — [[workflows/runs/developer-20260923232118|developer]] (US-123) — passed, story ouverte (API Substitutions en 403)
- 2026-09-24 — [[workflows/runs/developer-20260924124500|developer]] (US-123) — passed, story close
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260923233426|analyze-design-dev-review]] (US-118) — passed
- 2026-09-24 — [[workflows/runs/developer-20260924130000|developer]] (US-116, US-119) — passed ; US-119 close, US-116 ouverte (chemins de Pages employeurs à obtenir)
- 2026-09-24 — [[workflows/runs/developer-20260924140000|developer]] (US-120) — passed
- 2026-09-24 — [[workflows/runs/developer-20260924150000|developer]] (US-121) — passed
