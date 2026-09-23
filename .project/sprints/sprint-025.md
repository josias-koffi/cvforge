<!-- generated-by: plan « Offres du jour » (demande propriétaire 2026-09-22) -->

# Sprint 025

## 🎯 Sprint Goal

Épic **E19 — Offres du jour**. À l'issue du sprint, un candidat décrit ce qu'il cherche dans un
onglet « Ma recherche » attaché à son profil, et reçoit chaque matin une sélection d'offres qui
correspondent, dans l'app et par e-mail. Un clic sur « Postuler avec CVForge » crée la candidature
et enchaîne sur la génération de CV existante — c'est ce qui fait tourner les crédits.

Cible front : `apps/web`. `apps/app` est gelée, non touchée.

> ⚠️ **Absent de la vision** (`.project/vision.md` ne mentionne ni recherche d'offres ni veille).
> Ajouté sur demande explicite du propriétaire le 2026-09-22. À reporter dans la vision par le
> Product Owner — jamais en auto-édition (hard rule).

> ⚠️ **RÈGLE DE SOURCES** : seules des sources gratuites et dont les conditions autorisent l'usage.
> France Travail (licence de réutilisation : citer la source, renvoyer vers l'offre), La bonne
> alternance, et les endpoints publics des logiciels de recrutement. **Adzuna reste désactivé**
> (`ADZUNA_ENABLED=false`) : ses CGU limitent l'usage commercial à 14 jours d'essai, au-delà il faut
> un accord écrit. Aucun scraping de LinkedIn, Welcome to the Jungle, Indeed ou JobTeaser. Voir
> l'ADR `decisions/`.

> ⚠️ **RÈGLE DE FRAÎCHEUR** : aucune offre de plus de 30 jours n'est proposée, et une offre est
> vérifiée en direct avant d'être montrée puis au clic sur « Postuler ». Une entreprise qui oublie
> de retirer son annonce ne doit pas faire perdre une candidature.

> ⚠️ **RÈGLE DE DÉBIT** : toutes les requêtes sortantes passent par un limiteur par source. La
> collecte est quotidienne et mutualisée entre candidats — jamais un appel par affichage de page.

## 📅 Period

- Start: 2026-09-22
- End: 2026-09-23

## ✅ Tasks (3–8 max)

> **Ordre strict** : US-108 d'abord — tout le matching lit le projet de recherche. Puis les sources
> (US-109, US-110), le dédoublonnage (US-111), la tâche du matin (US-112), et enfin les surfaces
> (US-113, US-114). Les stories au-delà sont suivies dans le backlog (E19).

- [x] **[US-108]** Module « Projet de recherche » attaché au profil
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Table `search_projects` (1 pour 1 avec un profil), **sans clé étrangère** vers `profiles` :
          `PgProfilesStore.save` réécrit toutes les lignes du registre, une cascade effacerait la
          recherche à chaque sauvegarde de profil. Couvert par un test dédié.
    - [x] Types partagés dans `packages/types/src/search-project.ts` : contrats, niveaux, télétravail,
          tailles, valeurs RSE, et les ~21 secteurs avec leur correspondance NAF, définie une seule fois.
    - [x] Contrats en choix multiple, dont la paire **Stage + Alternance**, avec les champs propres
          au stage (début, durée, niveau) et à l'alternance (début, rythme, diplôme).
    - [x] `normalizeSearchProject` : toute valeur inconnue est écartée, listes bornées, textes tronqués.
    - [x] `prefillSearchProject` : intitulés depuis `headline` et la dernière expérience, ville depuis
          l'identité, contrats depuis l'ancien texte libre (`parseLegacyContractTypes`, FR et EN).
    - [x] `GET/PUT /profiles/:profileId/search-project` et `POST …/prefill`, propriété du profil vérifiée.
    - [x] Page dédiée `/ma-recherche` (d'abord un onglet du profil, déplacée après retour du
          propriétaire sur staging : on s'y perdait). L'ancien champ texte « Contrats recherchés »
          est retiré du formulaire de profil, qui garde un renvoi vers la page.
    - [x] La génération de lettre cite les contrats structurés, avec l'ancien texte libre en secours.
    - [x] Purge RGPD : les projets de recherche partent avec le compte (test de résidu vert).
    - [x] `pnpm lint` et `pnpm test` verts (API et web).
- [x] **[US-109]** Source France Travail + limiteur de débit par source
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] `SourceRateLimiter` : seau à jetons par source, rafale puis débit soutenu, `pauseUntil`
          après un 429 (en-tête `Retry-After` lu, y compris au format date HTTP), file d'attente
          qui survit à une tâche en échec. Horloge et `sleep` injectés : les tests mesurent le
          rythme au lieu de l'attendre.
    - [x] `buildSourceQueries` : une requête par (intitulé × département), **mutualisée entre
          candidats**. Une requête partagée élargit aux contrats des deux, retire le filtre
          d'expérience en cas de désaccord, et retire le filtre de secteur dès qu'un candidat
          n'en veut pas. Un candidat mobile ou 100 % télétravail est cherché sur toute la France.
    - [x] `toFranceTravailParams` : `typeContrat`, `natureContrat` (E2/FS pour l'alternance),
          `secteurActivite` (NAF), `experience`, `publieeDepuis`, `range`.
    - [x] `FranceTravailSource` : jeton OAuth mis en cache et rafraîchi une minute avant
          expiration, pagination par 150 jusqu'au plafond de 1 150 (journalisé pour redécoupage),
          204 lu comme « aucune offre », 206 comme une page normale, un 429 met la source en
          pause puis réessaie une fois, une page en échec conserve ce qui a été collecté.
    - [x] `isStillOpen` renvoie `null` (« on ne sait pas ») sur erreur réseau ou 429, jamais
          `false` : une offre vivante ne doit pas disparaître de la sélection sur un incident.
    - [x] Mapper : l'alternance est lue sur `natureContrat`/`alternance` et non sur `typeContrat`,
          un code inconnu vaut `unknown` (jamais CDI par défaut), `dateCreation` et non
          `dateActualisation`, entreprise anonyme détectée, département lu du libellé puis du code
          postal (Corse et outre-mer compris), liens partenaires collectés.
    - [x] Sans identifiants, la source est inerte : aucun appel, aucune erreur au démarrage.
    - [x] Variables documentées dans `.env.example` ; script `pnpm --filter @cvforge/api ft:smoke`
          pour vérifier les codes de référence sur la vraie API.
    - [x] 51 tests, `pnpm lint` et `pnpm test` verts.
    - [x] **Vérifié sur la vraie API le 2026-09-23**, identifiants en place : `ft:smoke` ramène des
          offres, la vérification en direct d'une offre répond `true`, et les quatre filtres
          rapportent des volumes non nuls (CDI 39, alternance 67, NAF 62/63 4, débutant 678).
          Codes confirmés par les référentiels : `typeContrat` (CDI, CDD, MIS, LIB),
          `natureContrat` (E2 apprentissage, FS professionnalisation), `secteurActivite` (divisions
          NAF à 2 chiffres). `typeContrat` et `natureContrat` sont bien **unis** et non croisés
          (878 + 67 = 940, moins 5 alternances déjà publiées en CDI).
    - [x] `experience` **corrigé** : les valeurs vont de 0 à 4 et un débutant relève du code 4
          (« débutant accepté », 678 offres) et non du 1 (« moins d'un an **exigé** », 43 offres).
    - [x] Le stage **n'a aucun code de contrat** chez France Travail : sur 129 annonces dont le
          titre annonce un stage, 56 sont publiées en CDI, 24 en CDD, 6 en intérim. Un candidat
          qui ne cherche qu'un stage est donc interrogé sans filtre de contrat, et
          `classifyContract` tranche chez nous.
- [x] **[US-110]** Sources « logiciels de recrutement » + registre d'entreprises
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] `detectAtsBoard(url)` reconnaît les **huit** logiciels et en extrait l'identifiant
          d'entreprise, y compris ceux qui n'ont pas encore d'adaptateur : une entreprise trouvée
          aujourd'hui sera collectée le jour où son adaptateur arrive.
    - [x] Adaptateurs **Greenhouse, Lever, Ashby, SmartRecruiters**, écrits sur les **formats réels**
          relevés en direct le 2026-09-23 (doctolib, swile, ledger, Sodexo), et testés sur ces
          charges utiles.
    - [x] `classifyContract` : stage, alternance, CDD, CDI, freelance, VIE, en français et en
          anglais ; `unknown` plutôt qu'une supposition. Le titre l'emporte sur une description qui
          ne fait que mentionner un autre contrat.
    - [x] `normalizeLocation` : ne garde que la France ou le télétravail, et nomme le département.
    - [x] `htmlToText` décode les entités **avant** de retirer les balises : Greenhouse sert son
          contenu doublement échappé.
    - [x] Table `job_boards` + registre : `register` n'écrase jamais une décision admin, une
          entreprise disparue (404) est retirée aussitôt, cinq échecs d'affilée la désactivent, et
          une collecte réussie ne réactive jamais un tableau désactivé.
    - [x] Le registre se remplit tout seul : les candidatures importées le nourrissent via
          `ApplicationsService.onOfferImported` — **le job-search dépend des candidatures, jamais
          l'inverse**, comme `AuthService.onAccountCreated`.
    - [x] Écran admin : `GET/POST /admin/job-boards` et `PATCH /admin/job-boards/:provider/:token`.
    - [x] Découverte Common Crawl : lecture du flux d'index, jetons invraisemblables écartés,
          **vérification sur l'API du fournisseur avant enregistrement**. Script
          `pnpm --filter @cvforge/api boards:discover`.
    - [x] Refactoring au passage : `fold` et `departmentFromPostcode` étaient dupliqués dans trois
          fichiers, désormais partagés.
    - [x] `pnpm lint` et `pnpm test` verts (1273 tests API).
  - ⚠️ **Reporté, avec raison** : **Workable** (tous les comptes sondés renvoient une liste vide —
        format non vérifiable), **Recruitee** (404 sur tous les sous-domaines essayés), **Personio**
        (flux XML, il faudrait un parseur — nouvelle dépendance, donc ADR), **Welcome Kit**
        (l'endpoint répond mais il faut une `organization_reference` réelle pour en connaître le
        format). Les quatre sont **détectés et enregistrés**, pas collectés.
  - ⚠️ **Non vérifié** : la découverte Common Crawl n'a jamais été lancée en vrai, et les liens
        partenaires France Travail ne peuvent pas encore alimenter le registre (il faut les
        identifiants de l'API).
- [x] **[US-111]** Dédoublonnage et agrégation des liens (une offre, plusieurs annonces)
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Deux niveaux en base : `job_listings` (une annonce par source) et `jobs` (l'offre unique
          montrée au candidat), plus `job_links` — la moitié certaine du dédoublonnage, un simple
          index sur les liens normalisés.
    - [x] Rattachement en trois étapes : **lien partagé** (certain), **clé stricte**
          (entreprise + intitulé + département normalisés), puis **similarité** intitulé *et*
          description, au sein d'une même entreprise et d'un même département.
    - [x] **Seuils mesurés, pas devinés** (2026-09-23) : pied de page ajouté = 4 bits, annonce
          tronquée à 60 % = 8 bits, annonces sans rapport = 14 bits ; « Développeur/Développeuse »
          = 0,74, « Data Analyst » vs « Data Analyst Senior » = 0,65, « Back-end » vs « Front-end »
          = 0,54. D'où 10 bits quand un intitulé doit aussi concorder, 3 bits quand la description
          est la seule preuve (entreprise anonyme).
    - [x] Les formes masculines et féminines d'un même métier se rejoignent (0,67 à 0,71 entre
          elles, 0,27 au plus pour des mots réellement différents).
    - [x] **Back-end et front-end de la même entreprise ne fusionnent pas**, malgré un texte
          d'annonce quasi identique.
    - [x] Une annonce déjà connue garde son offre : la décision n'est pas rejouée chaque matin.
    - [x] La source la plus fiable donne le texte affiché (page carrière de l'entreprise >
          France Travail > Adzuna) et `primaryUrl` pointe vers la candidature directe.
    - [x] La date de publication la plus ancienne l'emporte : une republication ne paraît pas neuve.
    - [x] Une offre n'est fermée que **quand toutes ses annonces le sont** ; une annonce qui
          réapparaît rouvre l'offre.
    - [x] Filet admin : `GET /admin/job-boards/merges` liste les fusions approximatives récentes,
          `POST …/merges/:listingId/detach` en défait une (l'annonce et ses liens repartent dans
          une offre à part, sinon la collecte suivante la refusionnerait).
    - [x] Tout est calculé dans l'application : **aucune extension Postgres, aucune dépendance**.
    - [x] 47 tests (fonctions pures + intégration sur vraie base), `pnpm lint` et `pnpm test`
          verts (1320 tests API).
  - ⚠️ **Limite connue et testée** : une même offre publiée en français d'un côté et en anglais de
        l'autre ne partage ni mots ni description ; elle n'est fusionnée que par un lien commun —
        le cas courant, puisqu'une offre France Travail porte le lien de l'entreprise.
- [x] **[US-112]** Tâche du matin : collecte, score déterministe, option IA payante
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] `JobDigestService` : collecte (France Travail + pages carrières), dédoublonnage,
          sélection par candidat, vérification en direct, écriture des propositions.
    - [x] **Verrou par ligne en base** (`job_digest_runs.run_date` en clé primaire) : deux
          instances qui démarrent le même matin s'insèrent, une seule passe. Pas de file de jobs,
          conformément au reste du dépôt.
    - [x] **Filtres stricts d'abord** : contrat, entreprise exclue, lieu ou télétravail, 30 jours,
          offre fermée, offre déjà proposée. Un contrat illisible n'est proposé qu'à qui accepte
          un CDI.
    - [x] Score sur 100 : intitulé 30, compétences 25, lieu 15, fraîcheur 15, expérience 10,
          salaire 5. Secteur et valeurs d'entreprise sont **absents** tant que la fiche entreprise
          n'existe pas — les ajouter à zéro plafonnerait tous les scores à 85.
    - [x] Lecture des salaires : décimales, séparateurs de milliers, taux horaire, et surtout
          « sur 12 mois » qui **termine un libellé annuel** (le lire comme mensuel transformait
          55 000 € en 660 000 €).
    - [x] Vérification en direct avant proposition : une offre que la source déclare disparue est
          retirée ; une vérification qui échoue laisse l'offre (« on ne sait pas » ≠ « elle n'est
          plus là »).
    - [x] Option IA payante : un appel par sélection, profil pseudonymisé (pas de nom, pas de
          coordonnées), entreprise anonyme jamais nommée. **Crédits débités après la réponse** :
          un modèle en panne ne coûte rien et la sélection part quand même dans l'ordre
          déterministe. Une offre inventée par le modèle est écartée, une offre oubliée est
          conservée en fin de liste.
    - [x] Nouvelle action `job_digest_rerank` dans `AI_CREDIT_COSTS` (1 crédit).
    - [x] Un candidat dont la sélection échoue perd un matin, pas la fonctionnalité.
    - [x] Purge RGPD : les propositions partent avec le compte.
    - [x] Script `pnpm --filter @cvforge/api job-digest:run` pour une exécution manuelle.
    - [x] 48 tests, `pnpm lint`, `pnpm build` et `pnpm test` verts (1368 tests API).
  - ⚠️ **Bug trouvé par les tests** : `Intl` en français écrit l'heure « 08 h », donc
        `Number("08 h")` valait `NaN` et la comparaison « est-il 6 h ? » passait toujours — la
        tâche aurait pu tourner à n'importe quelle heure. Corrigé en lisant les *parties*
        formatées, avec un test dédié.
  - ⚠️ **Non vérifié** : aucune exécution réelle (identifiants France Travail manquants), donc ni
        collecte ni appel IA en conditions réelles.
- [x] **[US-113]** Page « Offres du jour » et action « Postuler avec CVForge »
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] `GET /job-search/digest`, `GET /job-search/history`,
          `PATCH /job-search/matches/:id`, `POST /job-search/matches/:id/apply`.
    - [x] Une carte par offre unique : score, contrat, télétravail, salaire, compétences
          communes, explication IA si elle existe, et **« Disponible sur »** avec un lien par
          source encore ouverte (exigence des licences : citer la source, renvoyer à l'annonce).
    - [x] Actions : *Postuler avec CVForge*, *Voir l'offre*, *Garder*, *Pas pour moi*.
    - [x] **Vérification en direct avant de créer la candidature** : si l'offre a disparu, 410 et
          message « Aucun crédit n'a été consommé » — vérifié à l'écran, solde inchangé.
    - [x] La candidature est créée depuis le **texte de l'annonce déjà collecté** (l'URL ne sert
          de repli que si le texte est trop court), puis l'utilisateur est envoyé sur le flux de
          génération existant.
    - [x] Le statut `applied` ne peut pas être posé par le client : il vient de la candidature.
    - [x] Entrée « Offres du jour » dans la navigation, état vide qui renvoie vers « Ma recherche ».
    - [x] 8 tests de service + gates verts (1376 tests API, 322 web).
  - ✅ **Vérifié dans le navigateur** avec des offres de test en base : affichage des trois
        cartes, « Disponible sur » à deux sources, action *Garder*, et refus d'une offre fermée.
        Les données de test ont été retirées de la base de développement.
  - ⚠️ **Non vérifié** : le chemin « Postuler » complet (création de candidature + analyse IA)
        n'a pas été exécuté en vrai — il consomme un crédit sur le compte réel du propriétaire.
- [x] **[US-114]** Notification et e-mail du matin, désactivables
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Nouveau type de notification `job_digest`, créé via `createOncePerDay` : une seule
          annonce par matin, même si la tâche repasse.
    - [x] Nouvelle préférence e-mail `jobDigest` (activée par défaut), réglable depuis
          `/notifications` — désactivée, les offres restent visibles dans l'application.
    - [x] E-mail du matin : les 5 premières offres nommées, leur score, l'explication IA si elle
          existe, le nombre restant, un lien vers la page et **le lien de désinscription dans le
          corps du message**.
    - [x] **Rien n'est annoncé si rien de nouveau n'a été écrit** : un matin sans offre ne
          déclenche ni notification ni e-mail.
    - [x] Un envoi qui échoue n'enlève pas la sélection : elle attend sur la page, l'erreur est
          consignée dans les stats du run.
    - [x] Rendu de l'e-mail relu en vrai (texte et HTML), pas seulement supposé.
    - [x] 10 tests ajoutés, gates verts (1386 tests API, 322 web).
  - 🔒 **Faille corrigée au passage** : les e-mails existants (relance de candidature, achat de
        crédits) interpolaient sans échappement des titres d'offres et noms d'entreprises venus
        de sources tierces, directement dans le HTML du message. Échappement ajouté, couvert par
        un test.
  - ⚠️ **Non vérifié** : aucun e-mail réellement envoyé (SMTP non configuré ici).

- [x] **[US-115]** Recherche libre dans notre base d'offres (demande propriétaire, après staging)
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Page `/offres` : mots-clés, département, contrats, télétravail, pagination. Les critères
          vivent dans l'URL — une recherche se met en favori, se partage, et le bouton « retour »
          fonctionne.
    - [x] `GET /job-search/offers` interroge les mêmes offres que la sélection du matin, sans le
          filtrage par le projet de recherche : ici c'est le candidat qui décide.
    - [x] **Recherche insensible aux accents** : « developpeur » trouve « Développeur ». Corrigé
          avec `translate()` en SQL plutôt qu'avec l'extension `unaccent`, qui serait une décision
          de schéma.
    - [x] Chaque mot supplémentaire **restreint** la recherche au lieu de l'élargir.
    - [x] Une offre trouvée à la main peut être gardée, écartée, ou transformée en candidature :
          la ligne de suivi est créée à la première action, **sans score** — rien ne l'a classée,
          et afficher un chiffre serait un mensonge sur la carte.
    - [x] Les routes d'action passent par l'identifiant de l'offre : une seule carte sert la
          sélection du matin et la recherche.
    - [x] Entrées : élément de navigation « Rechercher une offre », bouton sur « Offres du jour »,
          et second bouton dans l'état vide.
    - [x] 13 tests ajoutés, gates verts (1399 tests API, 322 web).
  - ✅ **Vérifié dans le navigateur** : recherche sans accent, filtre par contrat, et « Garder »
        depuis un résultat (ligne créée avec score 0). Données de test retirées de la base.

## 📊 Sprint DoD

- [x] All tasks ticked
- [ ] All acceptance criteria verified
- [x] `run-tests` green (1386 API, 322 web, 97 landing)
- [ ] Coverage ≥ spec threshold sur le nouveau code
- [ ] QA review
- [x] Gate sources : aucune source payante ni scrapée activée (Adzuna codé, désactivé)
- [x] Gate fraîcheur : filtre strict à 30 jours, testé
- [x] ADR sources d'offres rédigé et accepté (ADR-023)

## 🚧 Risks

- **Adzuna** : inutilisable sans accord écrit. La V1 doit tenir sans lui.
- **Lever** interdit le robot de Common Crawl : ses entreprises ne seront trouvées que par les
  liens des offres France Travail et par les candidatures des utilisateurs.
- **Le planificateur** reste un `setInterval` avec verrou en base, comme le reste du dépôt. Correct
  en multi-instance grâce au verrou, mais à revoir si le produit passe à une vraie file de jobs.
- **Volume** : `job_listings` grossit vite. La purge (60 jours) et les index conditionnent le coût.

## 🐛 Corrigé après la mise en staging (2026-09-23)

- **La base d'offres restait vide.** La collecte ne construisait ses requêtes qu'à partir des
  recherches dont le digest du matin est activé. Sans aucune recherche configurée, zéro requête,
  zéro offre — et la journée était tout de même verrouillée, donc le script répondait « la collecte
  a déjà été faite ». Elle part désormais de **toutes** les recherches configurées ; seule la
  sélection et l'e-mail restent réservés à celles qui ont demandé le digest.
- **La page de recherche mentait.** « Rien trouvé, essayez moins de mots » s'affichait alors que la
  base ne contenait rien. Le nombre d'offres détenues remonte maintenant avec les résultats, et
  l'état vide renvoie vers « Ma recherche ».
- **`job-digest:run --force`** rend la journée avant de la reprendre : une recherche configurée
  après le passage du matin n'attend plus le lendemain. Rien n'est envoyé deux fois (unicité
  candidat × offre, notification une fois par jour).
- **`job-digest:status`** dit ce que chaque collecte a réellement fait et ce que les tables
  contiennent — « la collecte a tourné » et « la collecte a trouvé » sont deux choses différentes.
- **Les scripts ne tournaient pas dans le conteneur** (`tsx` absent de l'image de production) :
  variantes `*:built` sur le code compilé.

### Collecte réelle : deux plafonds non documentés (2026-09-23)

- **`secteurActivite` n'accepte que 2 divisions NAF.** Au-delà, l'API répond 400 et la requête ne
  ramène **rien**. Or la plupart de nos secteurs en comptent déjà 3 (Finance : 64/65/66, Santé :
  86/87/88), donc le filtre était perdant dès qu'un candidat cochait un secteur un peu large.
  Choix : au-delà de deux divisions, le filtre est **abandonné** et la collecte élargit. Perdre un
  peu de quota vaut mieux que perdre toutes les offres de la requête.
- **`publieeDepuis` n'accepte que 1, 3, 7, 14 ou 31.** Toute autre valeur est un 400. La fenêtre
  demandée est arrondie à la valeur supérieure autorisée, jamais inférieure.
- **Amorçage** : la passe quotidienne demande la veille (`publieeDepuis=1`). Pour remplir une base
  vide, `job-digest:run --force --since=31` collecte toute la fenêtre de rétention en une fois.
- **Âge d'une offre sur la page de recherche** : le filtre lisait la seule date de collecte, donc un
  import rétroactif aurait fait passer un mois d'annonces pour des offres du jour. Il lit désormais
  la plus ancienne des deux dates, comme le score le faisait déjà.

### Les autres sources produisent enfin (2026-09-23, lot 1)

- **Le registre d'entreprises était vide**, donc les quatre adaptateurs de logiciels de recrutement
  ne ramenaient rien, sans erreur. Deux apports le remplissent désormais :
  - `boards.seed.ts` : **22 entreprises livrées avec le code**, chaque jeton vérifié en direct sur
    l'API du fournisseur et retenu **seulement** s'il publiait au moins une offre en France ou en
    télétravail. Deux tiers des candidats plausibles répondaient 404, et trois grands groupes
    français servaient un tableau vide : aucun jeton n'a été deviné. Import par
    `pnpm --filter @cvforge/api boards:seed`, rejouable sans dommage.
  - Les **liens d'origine portés par les offres France Travail** sont enregistrés à chaque collecte
    (`registerManyFromUrls`, écrite depuis le début et jamais appelée). Dédoublonnés dans un `Set` :
    un import sur 31 jours en porte des milliers. Enregistrés **après** la lecture des entreprises,
    pour qu'un jeton non vérifié ne soit pas interrogé dans la foulée — un 404 le retirerait aussitôt.
- **Mesuré en local** : 22 entreprises, **412 annonces collectées, 395 offres uniques** (17 doublons
  fusionnés), sans aucune recherche configurée.
- Un fichier **TypeScript** plutôt que JSON : un fournisseur mal orthographié casse la compilation,
  et aucune donnée n'a à être copiée dans l'image.

### Administration de la collecte — `/admin/job-search` (2026-09-23, lot 2)

- Le contrôleur `admin/job-boards` servait déjà quatre routes **sans aucune interface** : voir le
  registre supposait un shell dans le conteneur. Deux onglets les exposent enfin, sans une ligne
  d'API nouvelle.
  - **Entreprises** : filtre par logiciel, ajout par l'URL d'une offre, activation et désactivation,
    origine de chaque entreprise, dernier statut, nombre d'offres et compteur d'échecs. Un
    fournisseur sans adaptateur est signalé « adaptateur à venir » plutôt que de paraître en panne.
  - **Doublons** : les rapprochements faits **par ressemblance** — les seuls qui puissent être faux
    — avec le bouton « Séparer ». Les rapprochements par lien ou par clé exacte n'y figurent pas :
    ils ne demandent pas d'avis.
- **Vérifié dans le navigateur** : les 22 entreprises s'affichent avec leurs compteurs réels, la
  désactivation puis la réactivation fonctionnent, et l'onglet Doublons annonce correctement qu'il
  n'y a rien à trancher (les 17 fusions locales l'ont été par lien, pas par ressemblance).
- Refactoring au passage : les libellés de contrats et de sources vivaient dans la carte d'offre et
  sont maintenant partagés (`lib/job-labels.ts`), l'admin nommant les mêmes sources.

### Lancer une collecte depuis l'admin (2026-09-23, lot 3)

Trois défauts rendaient un bouton « Lancer » dangereux, et le troisième existait déjà :

- **La date était la clé primaire d'une exécution** : une seule ligne par jour, donc aucun
  historique, et une collecte manuelle **écrasait les chiffres de la passe du matin**.
- **`--force` libérait la journée avant de la reprendre** : deux clics lançaient deux collectes
  concurrentes.
- **Une exécution interrompue restait `running` pour toujours** et bloquait la collecte du jour.

Corrigé par la migration `0025` : identité propre (uuid), et deux index uniques partiels qui
portent ce que la clé primaire portait — **une sélection du matin par jour**, et **une collecte à la
fois**. Le verrou est dans la base, pas dans une variable, parce que l'API peut avoir plusieurs
instances. Une ligne `running` de plus de deux heures est déclarée échouée au moment de réclamer.

- **Collecter n'est pas notifier.** `run({ kind: "collect" })` s'arrête une fois les offres
  enregistrées. Le bouton admin ne demande que ça : un bouton qui écrit à tous les candidats parce
  qu'on voulait tester une source est un incident en puissance.
- `POST /admin/job-search/runs` répond **202** immédiatement ; le démarrage en arrière-plan vit dans
  le service, jamais dans le contrôleur (`no-unresolved-promises.test.ts` l'interdit, et une
  promesse rejetée non gérée tue le processus). La page se rafraîchit tant qu'une exécution tourne.
- **Vérifié dans le navigateur** : collecte lancée, ligne « En cours » puis « Terminée — 22
  entreprises lues · 413 annonces », bouton réactivé tout seul, et **les chiffres du matin intacts**.

### Couper une source sans redéployer (2026-09-23, lot 4)

Table `job_sources` (migration `0026`), calquée sur `job_boards`. Deux questions étaient confondues
et restent désormais séparées à l'écran :

- **l'environnement décide de la disponibilité** — une source sans identifiants est muette quoi
  qu'il arrive ;
- **la table décide de l'activation** — couper une source configurée, sans toucher au déploiement.

- **La table ne pré-remplit pas la liste des sources** : le code la porte déjà (`jobSources`), et
  l'écrire deux fois obligerait à tenir deux listes en phase. Une source sans ligne est active et
  n'a jamais tourné ; le contrôleur compose la liste du code avec l'état stocké.
- `listDisabled()` et non `listEnabled()` : seul le négatif permet qu'une source ajoutée plus tard
  soit collectée dès que son adaptateur arrive, au lieu d'être ignorée faute de ligne.
- **Lu à chaque exécution**, pas au démarrage : les adaptateurs sont construits une fois à la
  construction du module, un interrupteur en base serait donc resté invisible jusqu'au déploiement
  suivant. `JobMatchesService` l'honore aussi — couper une source doit arrêter **tous** les appels,
  y compris la vérification qui précède un débit de crédit.
- Chaque source rapporte ce qu'elle a donné, **y compris les logiciels de recrutement** : sans cela
  l'écran aurait affiché « jamais appelée » pour un fournisseur lu à l'instant.
- **Vérifié de bout en bout** : Greenhouse coupé depuis l'écran, collecte relancée — 22 entreprises
  lues deviennent 18, et 414 annonces deviennent 283. Source réactivée ensuite.

### Deux pages d'offres lisibles (2026-09-23, lot 5)

Les cartes tenaient la moitié de l'écran, la description collectée n'était jamais affichée, et la
pagination se résumait à deux flèches. Refonte des deux pages sur un seul jeu de composants —
`offer-card`, `offer-sheet`, `offer-grid`, `offer-pagination` — partagés par `/offres` et
`/offres-du-jour` : deux grilles jumelles auraient divergé dès la première retouche.

- **Grille en requêtes de conteneur** (`@xl/main:grid-cols-2 @5xl/main:grid-cols-3`), comme le
  reste des pages : le nombre de colonnes suit la largeur du contenu, pas celle de la fenêtre, donc
  replier la barre latérale en ajoute une.
- **Le détail est dans un panneau**, pas sur la carte. Une carte que l'on parcourt doit être
  comparable à ses deux voisines, ce qu'un pavé de texte interdit ; seul « Pas pour moi » reste sur
  la carte, parce qu'écarter est la seule action qui vaut la peine sans rien ouvrir.
- **L'offre ouverte vit dans l'URL** (`?offre=<id>`) mais est lue **côté client**. Ces pages sont en
  `no-store` : une lecture serveur aurait rappelé l'API à chaque ouverture et chaque fermeture. Rien
  n'est rechargé, tout vient déjà de la charge utile de la page.
  *Limite assumée* : un lien vers une offre absente de la page n'affiche rien, faute d'endpoint
  « une offre ».
- **La flèche inactive est `aria-disabled` + `pointer-events-none`** : `disabled` ne veut rien dire
  sur un lien, et « Précédente » était cliquable en page 1.
- **`pageHref` est générique** sur les paramètres présents. Énumérer les filtres connus effacerait
  en silence ce qui viendrait ensuite ; l'offre ouverte, elle, est volontairement laissée de côté —
  elle n'est pas sur la page demandée.
- **Un seul chiffre nouveau, la date de publication** : une offre de ce matin et une de trois
  semaines ne valent pas le même effort, et rien ne le disait.
- **Vérifié en local avec la vraie base** (128 offres) : trois colonnes, panneau avec la description
  complète, pagination `‹ 1 [2] 3 … 7 ›`, retour arrière qui referme le panneau sans perdre le
  défilement. `/offres-du-jour` n'a pu être vu que dans son état vide — le compte local n'a aucune
  sélection — mais partage les mêmes composants.

## ⚠️ To Clarify

1. ~~Quota France Travail réel de notre application~~ → **tranché le 2026-09-23** en lisant la
   documentation officielle : **4 appels par seconde par application** (100 pour l'API entière),
   429 avec `Retry-After` au-delà, augmentation possible sur demande justifiée. Valeur par défaut
   corrigée dans le code.
2. ~~Codes de référence France Travail~~ → **vérifiés le 2026-09-23** sur la vraie API
   (référentiels `typesContrats`, `naturesContrats`, `secteursActivites` et recherches comptées).
   Seul `experience` était faux et a été corrigé. `ft:smoke` exerce désormais chaque filtre : un
   volume nul y signale un code à revoir.
3. Nom exact des champs de liens partenaires dans les offres France Travail — ils servent à la fois
   au dédoublonnage et à la découverte d'entreprises.
4. Partenariat JobTeaser : à demander si le propriétaire le souhaite (pas d'API publique).

## 🔁 Workflow Runs

_(à compléter à l'exécution)_
