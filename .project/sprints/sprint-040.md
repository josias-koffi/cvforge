<!-- generated-by: étude E33 du 2026-11-25 + essai réel claude.ai du 2026-11-26 (demande propriétaire) -->

# Sprint 040 — L'extension Chrome JobSpark postule sur le site du recruteur (palier 1)

## 🎯 Sprint Goal

Épic **E33**. Le 2026-11-26, un essai réel depuis claude.ai (connecteur JobSpark en production + Claude in
Chrome, offre Wavestone sur SmartRecruiters) s'est arrêté au champ « CV » : l'agent sait remplir le formulaire
mais ne peut pas y joindre le PDF. À l'issue du sprint, le candidat installe l'extension JobSpark et se connecte
à son compte en un clic. Sur une offre, l'extension prépare la candidature, puis remplit le formulaire du
recruteur **en joignant le CV et la lettre**. Elle répond aux questions avec les réponses enregistrées par le
candidat et lui montre un récapitulatif. Après son « Valider et envoyer », elle envoie la candidature et range la
preuve dans JobSpark.

Décision d'architecture : **ADR-034** (`decisions/ADR-034-chrome-extension-applies-for-the-candidate.md`).

> ⚠️ **Absent de la vision.** Demande explicite du propriétaire le 2026-11-26 (« laisser l'agent tout faire et
> postuler en toute confiance »).

> ⚠️ **RÈGLES (ADR-034)** :
>
> - page-agent en version exacte, derrière notre interface, sans fork ;
> - le jeton OAuth et la clé IA ne quittent jamais le service worker ;
> - préréglage de scopes `extension` (pas de `profile:write`) ;
> - jamais de réponse inventée : sans réponse enregistrée, on demande au candidat ;
> - jamais d'envoi sur LinkedIn ou Indeed, ni hors de l'hôte de candidature de l'offre ;
> - pas d'envoi sans preuve.
>
> Ce sprint livre le **palier 1** (validation à chaque candidature). Les paliers 2 et 3 sont prévus au backlog.

## 📅 Period

- Start: —
- End: —

## ✅ Tasks (3–8 max)

- [ ] **[US-194]** Prototype jetable : lever les trois doutes de l'étude
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Une extension MV3 minimale charge `@page-agent/core` dans l'onglet et y ajoute un outil personnalisé qui
          s'exécute.
    - [x] Les appels au modèle passent par le service worker : la clé n'apparaît ni dans la page ni dans ses
          requêtes.
    - [ ] `attach_document` dépose un PDF venu d'une URL signée JobSpark, sur au moins :
      - SmartRecruiters (le formulaire Wavestone du 2026-11-26 ou une offre équivalente) ;
      - Greenhouse, Lever et Workday ;
      - Teamtailor et France Travail, ou deux autres plateformes vues dans les offres.
    - [ ] Sur chacune, le champ montre le fichier et le formulaire l'accepte. Aucun envoi réel.
      - 2026-11-26 : ✅ SmartRecruiters, Greenhouse, Lever, Ashby, Recruitee, Workable ; ❌ **Workday** (compte
        candidat obligatoire, page blanche en navigateur automatisé). Case laissée ouverte : à trancher par le
        propriétaire (retirer Workday du critère ou en faire une story « connexion du candidat »).
    - [x] Résultat, limites rencontrées et décision go / no-go écrits dans `spikes/SPIKE-006-extension-attach-document.md`.

- [ ] **[US-195]** Squelette `apps/extension` et connexion au compte
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Une app WXT + React dans Turborepo, qui utilise `packages/types`, avec la `key` du manifeste fixée
          (`iciahkakhljbapmhkjjgopacegifndha`). `packages/ui` n'existe pas : Tailwind v4 avec les couleurs d'`apps/web`.
    - [x] « Se connecter à JobSpark » : OAuth par `chrome.identity.launchWebAuthFlow` (ADR-033) vers
          `https://<id>.chromiumapp.org/`, préréglage `extension`. La connexion apparaît dans `/compte/agents` et
          sa révocation déconnecte l'extension.
    - [ ] `chrome-extension://<id>` ajouté à `MCP_ALLOWED_ORIGINS` (préprod puis prod). Le service worker appelle
          `/mcp` sans CORS. Les jetons sont rafraîchis et gardés dans `chrome.storage.local`.
      - 2026-11-26 : préprod ✅ (origine admise, 401 sur jeton invalide ; autre origine 403). Prod : au prochain
        déploiement de `main`.
    - [x] Panneau latéral en français : état de connexion, solde, réglage de la clé IA personnelle.
- [x] **[US-196]** « Préparer » depuis l'onglet d'une offre
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Sur une page d'offre, l'extension appelle `import_offer` (ou retrouve la candidature existante).
    - [x] Elle annonce le coût en crédits, et seulement après l'accord du candidat, appelle `generate_cv` et
          `generate_cover_letter`.
    - [x] Une offre déjà envoyée est signalée et non repréparée.
- [x] **[US-197]** Remplir le formulaire, joindre les documents, répondre aux questions
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] page-agent remplit les champs du formulaire à partir du profil (`get_profile`).
    - [x] `attach_document` joint le CV et la lettre (champ fichier et zone de dépôt).
    - [x] Réponses types enregistrées dans le compte (API + écran dans le profil) : disponibilité, prétentions
          salariales, autorisation de travail, permis, mobilité, préavis.
    - [x] Une question sans réponse enregistrée met le remplissage en pause et la pose au candidat, qui peut
          enregistrer sa réponse pour la suite. Aucune réponse n'est inventée (test).
    - [x] Le texte de la page arrive au modèle balisé comme contenu non fiable. L'agent ne quitte pas l'hôte de
          candidature pendant le remplissage.
- [ ] **[US-198]** Envoi validé (palier 1) et preuve dans JobSpark
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Le récapitulatif montre l'offre, les documents et chaque réponse donnée. Le clic sur le bouton final ne
          part qu'après « Valider et envoyer ».
    - [ ] `submit_application` refuse dans quatre cas (tests) :
      - un hôte de la liste interdite (LinkedIn, Indeed) ;
      - un hôte autre que celui de l'offre ;
      - une candidature déjà envoyée ;
      - un champ obligatoire vide.
    - [ ] Nouvel outil MCP `record_submission` (`applications:write`). Il enregistre l'URL et une capture de la
          page de confirmation, les documents, les réponses et l'heure, puis passe la candidature au statut
          `sent`. Sans page de confirmation détectée, la candidature passe en « à vérifier ».
    - [ ] La preuve est visible dans la fiche candidature de l'app.

- [ ] **[US-202]** Remplissage avec le modèle de JobSpark, payé en crédits (décision du propriétaire du 2026-11-26)
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Action de crédit `form_fill` à 2 crédits, visible dans l'historique et le cockpit IA.
    - [ ] Outil MCP `start_form_fill` : session de 15 minutes et 60 appels, réservée à une candidature en
          brouillon ; relais `POST /agent/llm/chat/completions` (jeton d'agent, origine admise, session), modèle
          choisi côté serveur (`form_fill`, `gpt-4.1-mini` par défaut), clé du serveur, coût enregistré.
    - [ ] L'extension utilise ce relais par défaut, annonce « Remplir ce formulaire (2 crédits) » et le solde ;
          la clé personnelle reste une option avancée sans crédit.
    - [ ] Texte de confidentialité : le contenu du formulaire passe par JobSpark vers le fournisseur IA.

- [ ] **[US-203]** Remplissage d'abord par script, l'IA seulement pour le reste (demande du propriétaire du 2026-11-26)
  - Agent: `developer`
  - Pourquoi : un script remplit en 1 à 2 secondes, toujours de la même façon. L'IA prend 1 à 2 minutes et pose
    parfois des questions inutiles. La confiance dans l'agent vient d'abord de la prévisibilité.
  - Critères d'acceptation :
    - [ ] Passe déterministe dans la page, avant tout appel au modèle : identité (prénom, nom, nom complet, e-mail,
          téléphone, ville), liens (LinkedIn, GitHub, portfolio), CV et lettre, et réponses enregistrées dont le
          libellé correspond. Elle reconnaît les champs par `autocomplete`, `name`/`id`, libellé et `aria-label`, en
          français et en anglais, et ne touche jamais un champ déjà rempli.
    - [ ] Les listes (`select`, boutons radio) sont remplies seulement quand une option correspond exactement à la
          réponse enregistrée. Sinon, le champ est laissé à l'IA.
    - [ ] Réglages par plateforme pour Lever, Greenhouse, Ashby, Workable et Teamtailor, couverts par des
          fixtures HTML tirées des vrais formulaires.
    - [ ] L'IA n'est lancée que s'il reste des champs vides ; elle reçoit la liste de ces champs seulement. Un
          formulaire entièrement rempli par le script ne débite aucun crédit (`start_form_fill` n'est pas appelé).
    - [ ] Le panneau dit ce que le script a rempli, ce que l'IA a rempli, et le coût réel (0 ou 2 crédits).
    - [ ] Mesure sur les 6 formulaires réels de SPIKE-006 : part des champs remplis sans IA, durée et coût, avant
          et après.

## 📊 Sprint DoD

- [ ] Parcours réel de bout en bout sur une vraie offre, avec un seul geste du candidat, « Valider et envoyer » :
      offre → préparation → formulaire rempli avec CV et lettre joints → envoi → preuve dans JobSpark.
- [ ] ADR-034 acceptée et texte de confidentialité de l'extension prêt pour `/admin/legal` (lecture des pages des
      recruteurs, captures gardées en preuve, clé IA stockée localement).
- [ ] `pnpm lint` et tests de l'extension, de l'API et du web verts (CI).
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Les plateformes de recrutement refusent un fichier injecté**, par des champs maison ou des contrôles
  anti-robot. US-194 le mesure avant tout le reste ; un CAPTCHA arrête le parcours et passe la main au candidat.
- **page-agent** : `customTools` expérimental, un seul mainteneur. Il reste derrière notre interface (ADR-034 §2).
- **Injection de prompt** depuis une page de recruteur : pas de `profile:write`, hôte verrouillé, plafond de
  crédits par connexion.
- **La clé IA personnelle** freine le grand public. Un modèle payé par JobSpark fera l'objet d'une décision à part.

## ⚠️ To Clarify

- Fichier `LICENSE` du dépôt à décider avant de redistribuer du code MIT/Apache.
- Après ce sprint : mandat et paliers 2 et 3 (US-199, US-200), publication sur le Chrome Web Store (US-201).
- La vidéo LinkedIn « l'agent postule pour toi » se tourne une fois la DoD atteinte.

## 🔁 Workflow Runs

- 2026-11-26 — US-202 (décision : `gpt-4.1-mini`, 2 crédits, clé personnelle en option avancée ; mesure Sonnet 5.5 :
  0,18 à 0,26 $ par remplissage) : action `form_fill`, table `form_fill_sessions` (migration 0067), outil
  `start_form_fill`, relais `/agent/llm/chat/completions` (Sonnet/Opus 5.x : raisonnement bas, choix d'outil
  libre), extension en mode JobSpark par défaut (jeton OAuth rafraîchi une fois si besoin). Tests : API 167,
  extension 166, web lib 237, landing 321, types 75. Reste : texte de confidentialité, essai réel en préprod.

- 2026-11-26 — mesure du coût d'un remplissage (vrai `filler.js`, identité fictive, aucun envoi) :
  - `openai/gpt-4.1-mini` : Lever 10 appels 0,015 $, Ashby 16 appels 0,032 $, remplissage terminé ;
  - `anthropic/claude-haiku-5.5` : Lever 0,014 à 0,031 $, Ashby 0,046 à 0,066 $ (jusqu'à 54 appels, boucle) ;
  - un crédit vaut 3,4 c€ (pack Intensif) à 6,6 c€ (Essentiel). Modèle par défaut passé à `gpt-4.1-mini`.
  - Bugs trouvés et corrigés : sur un formulaire à un seul champ « Resume/CV », la lettre remplaçait le CV ;
    l'agent reposait la même question reformulée (15 fois) → questions proches dédoublonnées, 8 au plus par
    remplissage, consigne « libellé exact, jamais reposée ».

- 2026-11-26 — retour du propriétaire sur Lever (`…/apply`) : le formulaire n'était pas relié à sa candidature
  (adresse plus longue que celle de l'offre) et la carte « Remplir » masquait ses erreurs. Corrigé : une page dont
  l'adresse prolonge celle de l'offre sur le même site est reconnue ; depuis la page de l'offre, « Remplir » ouvre
  le lien « Postuler / Apply » du même site puis remplit. Vérifié sur Lever, Ashby et Workable avec le vrai
  `filler.js`. 159 tests extension.

- 2026-11-26 — US-198 :
  - API : table `application_submissions` (migration 0066, capture en `bytea`, liée à la candidature et au compte),
    outil MCP `record_submission`, `GET /applications/:id/submissions` et la capture par session ; carte « Preuve
    d'envoi » sur la fiche candidature ; export RGPD. Confirmée → statut « envoyée » ; sinon brouillon « à vérifier ».
  - Extension : récapitulatif après remplissage (offre, documents, chaque champ lu sur la page, obligatoires vides),
    refus d'envoi (LinkedIn/Indeed, autre site que l'offre, déjà envoyée, obligatoire vide, formulaire à étapes,
    bouton ambigu) revérifié juste avant le clic ; clic par le code de l'extension, jamais par le modèle ;
    confirmation reconnue seulement si la phrase n'était pas déjà sur la page ; capture JPEG ≤ 600 Ko. Permission
    optionnelle élargie à `<all_urls>` (exigée par `captureVisibleTab`).
  - Essai réel du `filler.js` de production sur le formulaire de test : lecture des champs, clic sur « Envoyer ma
    candidature », page « Merci pour votre candidature » vue, capture 15 Ko. Pas d'envoi réel chez un recruteur.
  - 148 tests extension (97,7 % des lignes), API applications/agents/privacy et web verts. Reste : déploiement
    préprod et essai réel par le propriétaire, puis la DoD du sprint (vraie offre de bout en bout).

- 2026-11-26 — essai réel US-197 par le propriétaire en préprod (réponses types, remplissage, question gardée) : OK.

- 2026-11-26 — US-197 :
  - API : table `screening_answers` (migration 0065), `GET/PUT /screening-answers`, outils MCP
    `get_screening_answers` (`profile:read`, avec les faits du profil) et `save_screening_answer` (nouveau scope
    `answers:write`, préréglages `extension` et `assistant`), export RGPD. Écran web `/profile/reponses`.
  - Extension : carte « Remplir le formulaire » ; `filler.js` (page-agent 1.12.4) injecté à la demande, appels IA
    relayés par le service worker (clé jamais dans la page), `attach_document` vérifié par la réaction de la page,
    clic d'envoi et liens hors site refusés, contenu de la page balisé non fiable, cookies refusés par consigne.
    Questions posées dans le panneau (une seule fois chacune), réponse gardée si le candidat le choisit.
  - Essai réel du `filler.js` de production (service worker de test, identité fictive, aucun envoi) :
    formulaire de test complet en 42 s ; Ashby (Qonto) en 46 s / 25 étapes : nom, e-mail, téléphone, ville,
    entreprise, LinkedIn, CV ; consentement laissé décoché ; questions posées seulement pour les vrais manques.
    Reste : une question parasite sur la lettre quand le formulaire n'a pas de champ pour elle.
  - 112 tests extension (97,7 % des lignes), API agents/profils/privacy et web verts. Reste : essai réel par le
    propriétaire en préprod (une reconnexion est nécessaire pour obtenir `answers:write`).
- 2026-11-26 — essai réel US-196 par le propriétaire en préprod : OK.

- 2026-11-26 — US-196 : carte « Offre de l'onglet » : accès aux pages demandé à la première utilisation
  (permission optionnelle), candidature retrouvée par adresse normalisée (sans fragment ni paramètres de suivi),
  coût détaillé par étape (analyse 1, CV 3, lettre 3) puis confirmation explicite. Le service worker revérifie
  l'onglet et le coût avant de dépenser. Une offre déjà envoyée est signalée sans rien préparer. Le texte lu dans
  le navigateur est envoyé avec l'adresse : `import_offer` accepte maintenant `url` + `offerText` (adresse gardée,
  rétrocompatible). 72 tests extension, 98 % des lignes ; 156 tests API (applications, agents). Reste : déploiement
  préprod et essai réel par le propriétaire.
- 2026-11-26 — essai réel US-195 par le propriétaire en préprod : connexion, solde et révocation OK.
- 2026-11-26 — US-195 : `apps/extension` (WXT 0.21.5, React 19, SDK MCP 1.32.2). OAuth par
  `launchWebAuthFlow` (DCR, PKCE, contrôle de `state` et `iss`, révocation à la déconnexion). Client MCP dans le
  service worker. Panneau en français : connexion, solde, clé IA masquée. 37 tests, dont le parcours OAuth contre
  un faux serveur ; 97 % des lignes couvertes.
  - Chromium : identifiant attendu ; préprod `POST /oauth/register` 201 avec l'adresse de retour chromiumapp.org ;
    `/mcp` 403 « Origine non autorisée » tant que `MCP_ALLOWED_ORIGINS` n'est pas déployé (variable ajoutée au
    manifeste de déploiement et à la stack).
  - Côté API : préréglage `extension` + `credits:read`, page de consentement sur le préréglage le plus étroit,
    serveur qui n'accorde jamais plus que la demande.
  - Reste à faire : déployer en préprod, puis un essai réel par le propriétaire (connexion, solde, révocation).
- 2026-11-26 — US-194 : prototype hors monorepo (`~/perso/projets/jobspark-e33-proto`). **GO** (SPIKE-006). Dépôt du
  CV réussi sur 6 plateformes (Workday exclu) ; agent complet sans envoi sur un formulaire Ashby réel ; 0 appel IA
  depuis la page ; le garde-fou refuse le bouton d'envoi. À intégrer : vérifier le dépôt par la réaction de la page,
  CAPTCHA toujours rendu au candidat, cookies refusés par défaut, réponses types élargies, lien signé sans e-mail.

- 2026-11-26 — essai réel claude.ai + connecteur JobSpark (prod, OAuth) + Claude in Chrome, offre Wavestone sur
  SmartRecruiters. Le connecteur, le consentement, la préparation et le remplissage des champs texte passent ;
  le blocage est le dépôt du PDF dans le champ « CV ».
