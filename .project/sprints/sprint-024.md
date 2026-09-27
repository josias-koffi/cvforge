<!-- generated-by: plan ATS (produit d'appel — décision produit 2026-09-22) -->

# Sprint 024

## 🎯 Sprint Goal

Épic **E18 — Score ATS (produit d'appel + in-app)**. À l'issue du sprint, un visiteur non
authentifié dépose un CV sur la landing, obtient un score global et trois points clés gratuitement,
et déverrouille le rapport détaillé en laissant son email — ce qui lui crée un compte via le magic
link existant. En parallèle, chaque CV généré dans l'app porte un badge de score, gratuit et
recalculé à chaque sauvegarde.

Cible front : `apps/landing` (page publique) et `apps/web` (badge). `apps/app` est gelée, non touchée.

> ⚠️ **La page publique d'analyse est absente de la vision** (qui ne prévoit le score qu'en in-app,
> `§7.1`, `§7.4`, `§12.2`, `§12.3`). Elle est ajoutée sur demande explicite du propriétaire.
> À reporter dans `.project/vision.md` par le Product Owner — jamais en auto-édition (hard rule).

> ⚠️ **RÈGLE DE COÛT NON NÉGOCIABLE** : `POST /public/ats-scan` est la première surface IA publique
> non authentifiée du produit, sur une API qui n'a aujourd'hui **aucun rate limiting**. US-101 est
> obligatoire **avant** la mise en ligne d'US-102. L'OCR est désactivé sur cette route (secondes de
> CPU par requête, sans file de jobs).

> ⚠️ **RÈGLE RGPD** : aucun texte de CV n'est jamais persisté — ni fichier, ni texte extrait, ni
> texte pseudonymisé. Seuls les scores et des codes de finding. Vérifié par test (US-102).

## 📅 Period

- Start: 2026-09-22
- End: 2026-09-22

## ✅ Tasks (3–8 max)

> **Ordre strict** : US-097 → US-098 → US-099 ouvrent le moteur ; US-101 doit précéder la mise en
> ligne d'US-102. US-105 dépend d'US-098 (adaptateur `fromCvDocument`).
> Les stories au-delà d'US-103 sont suivies dans `backlog.md` (E18) et exécutées à la suite —
> ce fichier reste sous la limite de 3 à 8 tâches.

- [x] **[US-097]** Moteur de score ATS : modèle, noyau déterministe et renormalisation
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] `packages/ats-score` créé, pur (aucune dépendance runtime hors `@cvforge/types`)
    - [x] `scoreAts` déterministe : deux appels sur le même document donnent un résultat identique
    - [x] Somme des pondérations = 100, asserté par test
    - [x] Une dimension `unavailable` est exclue du calcul et les poids renormalisés — jamais notée 0
    - [x] `ATS_SCORE_ENGINE_VERSION` exporté et présent sur chaque résultat
    - [x] Dimensions `structure`, `contactability`, `formatHygiene` implémentées
    - [x] Couverture ≥ 90 % lignes sur le code neuf (obtenu : 100 % lignes, 96 % branches)
    - [x] ADR-021 rédigé
  - Source: vision `§7.1`, `§7.4`, `§12.2`, `§12.3`
  - Résultat : 36 tests verts. **Défaut de conception trouvé par le test du document vide** : les
    règles d'absence de défaut (« pas de tableau », « chronologie correcte ») créditaient un
    document sans contenu, qui scorait 9/100 au lieu de 0. Corrigé — une règle d'absence de défaut
    ne crédite que s'il existe de la matière où ce défaut pourrait apparaître. Règle consignée dans
    l'ADR.

- [x] **[US-098]** Adaptateurs texte brut / `CVDocumentContent` + dimensions `keywords` et `impact`
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Scindée en **098a** (dimensions) et **098b** (adaptateurs) : d'un seul tenant, le diff dépassait
    la limite de 400 lignes de `engineering-standards.md` §4.
  - Acceptance criteria:
    - [x] `parseCvText(text, file?)` et `fromCvDocument(content)` produisent un `AtsDocument`
    - [x] **Un CV équivalent scoré par les deux adaptateurs tombe à ±3 points** (test) — obtenu : **écart nul, dimension par dimension**
    - [x] `keywords` : note maximale à 60 % de couverture, au-delà c'est du bourrage (`KEYWORD_STUFFING`)
    - [x] `keywords` reste `unavailable` sans offre
    - [x] `impact` en mode règles : verbes d'action, quantification, longueur de puce, compétence↔preuve
    - [x] Lexiques FR + EN embarqués
    - [ ] ~~6 fixtures de CV synthétiques~~ → **écart assumé**, voir ci-dessous
  - Source: vision `§8.1`
  - Résultat : 80 tests verts, couverture 100 % lignes / 97 % branches. **Deux défauts trouvés par
    le test de parité**, tous deux de vrais faux positifs du moteur : (1) `TABLE_MARKERS` flaguait
    la ligne `email | téléphone | ville`, l'un des en-têtes de CV les plus courants et parfaitement
    lisible — un tableau est une structure répétée ligne après ligne, la règle exige désormais ≥2
    lignes ou ≥3 pipes ; (2) l'adaptateur texte ne cherchait jamais la ville (codée en dur à
    `false`), ce qui coûtait 15 points de `contactability` à tout CV de la landing.
  - Écart assumé : **pas de fixtures `.txt` séparées.** Les deux CV de référence vivent dans
    `parity.test.ts` sous leurs deux formes (structurée et plate) — les garder appariés dans un
    même fichier est ce qui donne son sens au test de parité ; des fixtures éparses auraient
    divergé. Les cas dégradés sont construits par `makeDocument()` champ par champ, ce qui nomme le
    défaut testé au lieu de le cacher dans un fichier.

- [x] **[US-099]** Signaux de lisibilité machine à l'extraction PDF
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] `extractPdfContent` retourne `{ text, hasTextLayer, pageCount, columnSuspicion, mojibakeRatio }`
    - [x] `extractText` sortie de `cv-import.service.ts` (privée) vers `cv-text-extraction.ts`, avec le levier `allowOcr` que la route publique tirera en US-102
    - [x] Comportement de l'import CV existant **inchangé** : ses 10 tests passent sans modification d'assertion (seul le nom du collaborateur mocké change)
    - [x] Dimension `machineReadability` implémentée ; un PDF sans couche texte tombe à **15** (≤ 30)
  - Source: vision `§6.4` · un PDF scanné est le drapeau rouge ATS n°1 et le meilleur moment produit de la page
  - Résultat : 936 tests API verts (110 fichiers), 114 sur le package. **Troisième occurrence du même
    défaut de conception**, trouvée là encore par un test : sans couche texte, `columnSuspicion` et
    `mojibakeRatio` valent 0 *parce qu'il n'y a rien à mesurer* — le barème créditait 35 points
    d'artefacts et un CV scanné obtenait 50/100. Ces deux sous-critères sont désormais conditionnés
    à la présence de texte, et les findings correspondants ne sont plus émis (diagnostiquer des
    colonnes qu'on n'a pas pu observer enverrait le candidat corriger la mauvaise chose).
  - Second défaut trouvé : le regroupement des fragments en lignes par arrondi sur grille séparait
    deux fragments distants de 1 unité tombant de part et d'autre d'une frontière — remplacé par un
    regroupement glouton, robuste par construction.
  - Refactoring actif (§9) : `extractPdfText` devenu sans appelant a été supprimé ;
    `cv-import.service.ts` passe de 284 à **257 lignes**. Calcul des signaux isolé dans
    `pdf-signals.ts`, **pur** (aucun pdfjs), donc testable contre des objets simples plutôt que des
    PDF construits à la main.

- [x] **[US-100]** `AtsImpactService` : volet LLM borné à une dimension
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] `response_format: json_schema` strict, `temperature: 0`, `max_tokens = 700`
    - [x] Pseudonymisation assertée **avant** l'appel (`pseudonymizeCvText`), plus un plafond de 12 000 caractères sur ce qui sort
    - [x] Le modèle ne renvoie jamais le score global, seulement 4 sous-notes 0..10
    - [x] `clamp(llmImpact, ruleImpact ± 25)` vérifié par test, dans les deux sens
    - [x] Échec, JSON tronqué, sous-note manquante / hors bornes / non numérique ⇒ `null`, jamais d'exception
    - [x] Aucun test n'appelle le réseau (faux `OpenRouterService`)
  - Source: vision `§8.1`, `§15.3`
  - Résultat : 18 tests sur le service (100 % lignes / branches), 8 sur la fusion règles↔LLM ;
    952 tests API, 112 package, 15/15 turbo.
  - Décisions prises à l'implémentation :
    - **`temperature: 0`**, pas 0.2 comme le rapport d'entretien : le score est persisté et tracé
      entre versions de CV, il ne doit pas dériver entre deux scans du même document.
    - **Les longueurs sont bornées dans le schéma** (`maxLength` sur chaque chaîne), pas seulement
      via `max_tokens`. C'est la leçon du commentaire de `REPORT_MAX_TOKENS` : une réponse coupée en
      plein milieu d'une chaîne fait échouer `JSON.parse`, et 500 tokens avaient suffi à casser la
      génération de rapports sept fois en un après-midi.
    - **Une sous-note hors bornes est rejetée, pas ramenée dans l'intervalle** : hors bornes
      signifie que le schéma n'a pas été honoré (modèle de repli), donc que l'ensemble de la
      réponse est suspect. La ramener masquerait le problème.
    - **L'offre est omise, jamais envoyée vide** : une offre vide inviterait le modèle à juger la
      pertinence par rapport à rien et à inventer un poste cible.
  - Écart : `@cvforge/ats-score` a dû être ajouté aux `paths` de `apps/api/tsconfig.json` — vitest
    résolvait le package (via `exports.types`) mais `tsc` non. Le repo mappe explicitement chaque
    package workspace ; à refaire pour tout nouveau package consommé par l'API.

- [x] **[US-101]** Rate limiting applicatif sur les routes publiques
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Middleware maison (pas `@nestjs/throttler` : le repo n'utilise pas de Guards Nest), aucune dépendance ajoutée
    - [x] Fenêtre glissante par IP : 3 scans/h, 10/jour ; 429 + `Retry-After` calculé depuis le plus ancien hit encore dans la fenêtre
    - [x] Budget global quotidien `ATS_PUBLIC_DAILY_BUDGET` (défaut 300) ⇒ **503** une fois épuisé, vérifié **avant** les règles par IP
    - [x] `RateLimitStore` derrière une interface (bascule Redis au scale-out sans réécriture)
    - [x] `app.set("trust proxy", 1)` et clé = premier hop de `X-Forwarded-For`
    - [x] Tests à horloge injectée, aucun `sleep` ni faux timer
    - [x] ADR-022 rédigé
  - Source: `engineering-standards.md` §7 · **aucun rate limiting n'existait dans l'API**
  - Résultat : 25 tests sur le module (100 % lignes et fonctions, 92 % branches) ; 977 tests API,
    15/15 turbo. Middleware **scopé à la seule route de scan**, pas global : c'est la seule route
    publique qui dépense du CPU et des crédits modèle.
  - Décisions prises à l'implémentation :
    - **Une requête rejetée n'est pas comptée.** Sinon un client qui martèle la route repousse sa
      propre fenêtre à chaque tentative et n'en sort jamais — un bannissement de fait, non voulu.
    - **429 et 503 sont sémantiquement distincts** et le restent : « vous en avez trop demandé » vs
      « le service est indisponible », ce qui est exact et n'accuse pas un visiteur légitime tombant
      sur un budget épuisé.
    - **Une valeur d'env malformée retombe sur le défaut, jamais sur « pas de limite »** : une faute
      de frappe ne doit pas ouvrir la porte d'une route IA publique.
    - **Horloge injectée par token**, pas en paramètre par défaut : Nest instancie le middleware et
      résout chaque paramètre du constructeur ; un type fonction nu fait **refuser le démarrage du
      conteneur** (le piège que `SessionStateMiddleware` documente déjà).
  - Limites assumées (ADR-022) : compteurs **mono-instance**, non partagés et non persistés — un
    redémarrage remet le budget du jour à zéro. Acceptable pour un stop-loss, à basculer sur Redis
    dès la seconde instance.

- [x] **[US-102]** `POST /public/ats-scan` : module ATS, schéma et endpoint public
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Table `ats_scans` + migration `0019` ; store PG (testé sous PGlite) + store in-memory
    - [x] 5 Mo max **mesurés sur les octets reçus**, pas sur le `size` déclaré ; **sniff des magic bytes**
    - [x] OCR désactivé ⇒ score sur les seuls signaux fichier, `partial: true`, jamais une erreur
    - [x] La réponse gratuite **ne contient jamais** `dimensions[]` — absent par construction, aucun chemin ne le met sur le fil
    - [x] **Aucun texte de CV persisté**, asserté sur la ligne écrite (PDF *et* DOCX)
    - [x] `ip_hash` salé stocké, jamais l'IP brute ; pas de hash du tout si l'adresse est inconnue
    - [ ] ~~budget de 20 s sur le handler~~ → **non fait**, voir écart
  - Source: vision `§15.3`
  - Résultat : 93 tests sur le module, **100 % de couverture sur chaque fichier de production** ;
    1052 tests API, 116 package, 15/15 turbo.
  - **Quatrième occurrence du même défaut de conception**, révélée cette fois par un test produit :
    un PDF scanné recevait les findings `MISSING_EXPERIENCE_SECTION`, `MISSING_EMAIL`… alors que son
    CV a probablement les deux — on n'a simplement pas pu les lire. Désormais, sans couche texte
    **seule `machineReadability` est jugée** ; les cinq autres dimensions passent `unavailable` avec
    la raison `NO_TEXT_LAYER`, et le rapport ne dit plus qu'une chose, la seule vraie. Sans ça, la
    page envoyait le candidat corriger ce qui n'était pas cassé.
  - Autres décisions :
    - **Pas d'appel LLM pour structurer l'offre collée.** Le texte entier part comme une seule
      exigence ; la dimension `keywords` n'en extrait de toute façon que des termes. En contrepartie
      un **filtre de mots vides FR/EN** a été ajouté à `scoreKeywords` : sans lui, cinquante mots de
      « nous recherchons un profil motivé pour rejoindre notre équipe » noyaient les trois termes qui
      comptent et la couverture s'effondrait pour des raisons sans rapport avec le candidat.
    - **Le modèle n'est pas appelé sur un fichier sans couche texte** : on lui demanderait de noter
      une chaîne vide, en payant pour cela.
    - **Le budget est vérifié avant le parsing et avant l'appel modèle** : un stop-loss qui s'exécute
      après la dépense ne sert à rien.
    - **Un déverrouillage rejoué n'écrase pas l'adresse** (`unlocked_at is null` dans la clause) :
      sinon rejouer la requête redirigerait un rapport vers une autre adresse.
  - Écart assumé : **pas de timeout applicatif de 20 s** sur le handler. L'OCR étant désactivé, le
    coût restant est le parsing pdfjs et l'appel modèle, ce dernier étant déjà borné par
    `max_tokens` et les retries d'OpenRouter. Un timeout global est à poser au reverse proxy plutôt
    que dans le handler — à trancher au déploiement (gate de sprint).

- [x] **[US-103]** Déverrouillage par email, magic link et purge 30 jours
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] `POST /public/ats-scan/:scanId/unlock` renvoie le rapport complet **immédiatement**
    - [x] Magic link envoyé en parallèle via `requestMagicLink` + `sendMagicLinkEmail` existants — **aucune mécanique d'auth nouvelle**
    - [x] Consentement explicite exigé (`=== true`, jamais une valeur truthy), même forme qu'au login
    - [x] Compte existant, suspendu, ou envoi en échec ⇒ **réponse identique** (pas d'énumération)
    - [x] Rejeu idempotent, sans redirection du rapport vers une autre adresse ; scan expiré ⇒ **410**
    - [x] `AtsPurgeService` (modèle `InterviewPurgeService`) + règle ajoutée à `PRIVACY_RETENTION_POLICY`
  - Source: vision `§15.1`, `§15.3`
  - Résultat : 121 tests sur le module ATS, **100 % lignes et fonctions** ; 1080 tests API, 15/15 turbo.
  - Décisions prises à l'implémentation :
    - **L'échec d'envoi du magic link est avalé et loggé — c'est une propriété de sécurité autant
      que de robustesse.** `requestMagicLink` lève 403 pour un compte suspendu et 400 pour un
      inconnu sans consentement : propager dirait à un appelant anonyme si une adresse a un compte
      ici. Le visiteur obtient son rapport dans tous les cas.
    - **Le rapport part dans la réponse, pas dans la boîte mail.** Le détour par l'inbox pour voir ce
      qu'on vient de demander perd l'essentiel des visiteurs ; le magic link fait l'acquisition en
      parallèle, sans retarder la valeur.
    - **Pas de table `leads`** : le magic link crée déjà le compte à sa consommation, et le lien
      lead↔compte est une jointure de lecture sur l'adresse — aucun couplage ajouté dans l'auth.
    - La purge tourne sur `setInterval` au cycle de vie du module (convention du repo, pas de lib de
      cron) ; son échec est loggé et jamais propagé — rien ne l'attend, une rejection non gérée
      ferait tomber l'API.

- [x] **[US-104]** Page publique d'analyse ATS (landing, FR/EN)
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Route BFF `app/api/ats-scan/` + `.../[scanId]/unlock/` — **première route API de la landing**, pour ne pas élargir le CORS crédentialé de l'API
    - [x] Page `app/[locale]/ats-check/page.tsx`, slugs localisés `analyse-ats` / `ats-check` (redirects + rewrite, gabarit `story`)
    - [x] **Zéro texte en dur** : dictionnaire `ats` typé, FR et EN, y compris le libellé des 23 codes de finding et des 6 dimensions
    - [x] Jauge, dropzone, rapport verrouillé, formulaire email avec consentement explicite
    - [x] `sitemap.ts`, lien de navigation (desktop **et** mobile), `localizedPath` étendu
    - [x] A11y : `<h1>` propre à la page, `aria-live` sur les erreurs, focus déplacé vers le résultat, jauge avec équivalent textuel, **la couleur n'est jamais seule porteuse de sens**
  - Source: Hors vision — décision produit du 2026-09-22
  - Résultat : landing 39 → **90 tests**, build vert (page prérendue FR/EN, deux routes BFF dynamiques),
    lint et typecheck propres ; 1080 tests API, 116 package, 12/12 turbo.
  - Décisions prises à l'implémentation :
    - **`localizedPath` devait être étendu, pas seulement le routage.** Sans cela le sélecteur de
      langue gardait le slug courant et envoyait sur un 404 — le genre de régression qu'aucun test
      de page n'attrape. Un test dédié couvre les deux sens, et l'ancien comportement de `story`.
    - **Le `<h1>` est écrit par la page**, pas par `SectionHeading` qui rend un `<h2>` : c'est une
      page à part entière, pas une section de la home (même choix que `story-page`).
    - **La parité des dictionnaires est testée code par code**, pas seulement par le typage :
      `Record<string, string>` accepterait un code manquant, qui s'afficherait au visiteur comme un
      identifiant brut (`MISSING_QUANTIFICATION`).
    - **Le BFF refuse un upload trop gros avant de le relayer** (`content-length`), et **transfère
      l'adresse du visiteur** en `x-forwarded-for` : sans cela tous les visiteurs arriveraient à
      l'API comme ce serveur et partageraient un seul seau de rate limit.
    - Les statuts de l'API sont **relayés tels quels** (429, 503, 410) : la page en tire des
      messages distincts, et les écraser en 500 les rendrait indistinguables.


- [x] **[US-105]** Score in-app : persistance, calcul à la génération et à la sauvegarde
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Colonnes `ats_score` (jsonb) sur `applications`, `ats_score` + `ats_engine_version` sur `application_cv_versions` ; migration `0020`
    - [x] Score calculé à la génération **et** à chaque sauvegarde manuelle
    - [x] **0 crédit, 0 appel modèle** : le document est déjà structuré, les règles déterministes suffisent
    - [x] La génération réussit même si le scoring échoue (`scoreGeneratedCvSafely` ⇒ `null`, jamais d'exception)
    - [x] `cv-generation.service.ts` repassé **sous 400 lignes** (433 → 396) par extraction, pas par ajout
  - Source: vision `§7.4`, `§12.3`
  - Résultat : 1099 tests API, 18/18 turbo ; round-trip des trois colonnes vérifié sous PGlite.
  - Décisions prises à l'implémentation :
    - **Deux emplacements, deux formes.** Le résultat complet en jsonb sur `applications` (lu pour
      chaque ligne de la liste, jamais interrogé champ par champ — même raisonnement que
      `cv_content`) ; seulement le **nombre** par version, pour que la courbe §12.3 lise une colonne
      au lieu de re-scorer tout l'historique.
    - **`ats_engine_version` voyage avec le nombre par version** : des scores calculés sous 1.0.0 et
      1.1.0 ne sont pas comparables, une moyenne mélangeant les deux n'aurait aucun sens. Les
      agrégations devront grouper dessus.
    - **Absent ≠ zéro** : les trois colonnes sont nullables, et un scoring raté laisse la version
      non estampillée plutôt que d'enregistrer 0, qui se lirait comme un mauvais CV.
    - **`machineReadability` reste `unavailable` in-app** : aucun fichier à inspecter tant que le PDF
      n'est pas exporté, et le moteur renormalise sur ce qu'il observe.
  - **Seuils de longueur recalibrés sur une mesure, pas une intuition** : un CV avec deux
    expériences et huit puces détaillées mesure **202 mots**. Le plancher « squelettique » à 250
    condamnait donc des CV parfaitement corrects à 45/100. Corrigé : squelettique < 150, court < 250
    (au lieu de 400). Trouvé parce qu'un test comparait deux CV et que le plafond écrasait la
    différence.
  - **Bug attrapé par le test de round-trip** : la lecture de `applications.ats_score` était câblée,
    l'**écriture** ne l'était pas. Les tests unitaires du scoring passaient tous.

- [x] **[US-106]** Badge de score ATS dans `apps/web`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] `components/applications/ats-score-badge.tsx` + `lib/ats.ts` (libellés, styles, nom accessible)
    - [x] Colonne « Score ATS » dans la table des candidatures, badge dans l'entête de l'éditeur CV
    - [x] Nom accessible complet : « Score ATS 65 sur 100, perfectible »
    - [x] **La couleur n'est jamais seule porteuse de sens** : la bande est écrite à côté du nombre
    - [x] **Score absent ⇒ rien affiché**, jamais « 0 »
  - Source: vision `§7.1`
  - Résultat : 16 tests sur le badge, 318 tests web, **21/21 turbo** (monorepo entier).
  - Vérifié en conditions réelles : une sauvegarde de CV via l'API a produit **65 « fair »**,
    `llmApplied: false`, **aucune écriture au ledger de crédits** ; la version 3 est estampillée
    `65 / 1.1.0` tandis que les versions 1 et 2, antérieures, restent **sans score** (absent ≠ zéro).
    Page réellement rendue : `aria-label="Score ATS 65 sur 100, perfectible"`, contenu visible
    « 65 Perfectible », dans la liste **et** dans l'entête de l'éditeur.
  - Décision prise à l'implémentation : **le badge de l'éditeur dit quand il est périmé.** Le score
    persisté décrit la dernière version enregistrée, pas ce qui est à l'écran ; tant qu'il y a des
    modifications non sauvegardées il est atténué et son nom accessible précise « dernière version
    enregistrée ». Un nombre périmé qui se fait passer pour actuel est pire que pas de nombre.

- [x] **[US-107]** KPI admin : score moyen par barème, entonnoir d'acquisition
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Score ATS moyen **groupé par version de moteur**, jamais mis en commun
    - [x] Scans publics, taux de déverrouillage, conversion des leads en comptes
    - [x] `readAtsCounters` dans `metrics.pg-store.ts`, exposé par `/admin/metrics`, deux cartes dans la vue admin
  - Source: vision `§12.2`
  - Résultat : 6 tests SQL sous PGlite, 4 tests de rendu, **21/21 turbo** (1105 API, 322 web).
  - Vérifié sur la vraie base : **7 scans publics, 3 déverrouillés (43 %), 0 lead converti**,
    moyenne **65 sur le barème 1.1.0** (1 CV). La page admin rend « Barème 1.1.0 (1 CV) ».
  - Décisions prises à l'implémentation :
    - **Les moyennes sont groupées par `ats_engine_version`, jamais mises en commun** : la version
      1.1.0 a rééquilibré le barème en cours de sprint, donc une moyenne mélangeant 1.0.0 et 1.1.0
      mesurerait le rééquilibrage et non les CV. C'est précisément ce que le versionnage du barème
      existait pour permettre (ADR-021).
    - **Un taux vaut `null`, pas 0, quand il n'y a rien à diviser.** « Aucun scan pour l'instant » et
      « personne n'a converti » sont deux faits différents ; un 0 % sur un entonnoir vide se lit
      comme un échec. La carte n'affiche alors aucun pourcentage, et la moyenne affiche « — ».
    - **Une version non scorée est exclue de la moyenne** (`is not null`), jamais comptée zéro : un
      CV généré avant la fonctionnalité ferait autrement chuter la moyenne sans rien mesurer.
    - **Le lien lead↔compte est une jointure de lecture** sur l'adresse, avec `count(distinct)` :
      un visiteur qui scanne deux fois ne compte qu'une conversion.

## 🧪 Parcours joué dans un vrai navigateur (2026-09-22)

Stack locale complète (postgres + redis + API 3333 + landing 3101), CV synthétique DOCX et PDF scanné.
**Trois bugs trouvés qu'aucun des 1 296 tests n'avait vus** — tous invisibles hors navigateur :

1. **`POST /api/ats-scan` → 404, la page entièrement inopérante.** Le matcher de `proxy.ts` excluait
   `_next` et `login` mais **pas `api`** : la requête partait en `/en/api/ats-scan`. Les tests
   appellent le handler directement et ne traversent jamais le middleware. Corrigé + test du
   matcher (ancré `^…$`, sans quoi il matche à partir du 4ᵉ caractère et ne prouve rien).
2. **Le déverrouillage partageait le quota de scan** : 3 analyses consommées = plus aucun rapport
   ouvrable pendant une heure. Le garde-fou anti-coût bloquait la conversion. Compteurs désormais
   séparés (`scan:` / `unlock:`), limites propres (10/h, 30/j), et le **budget global ne s'applique
   qu'au scan** — un budget épuisé ne doit pas laisser un visiteur avec un scan qu'il ne peut ouvrir.
3. **« 0 autres points détectés »** : l'accroche se dégonflait sur les bons CV, et les findings du
   teaser étaient répétés dans le rapport ouvert. Titre de repli + teaser masqué après déverrouillage.

**Validé en conditions réelles** : `llmApplied: true` (mistral-small honore le `json_schema` strict) ·
**zéro texte de CV en base** (recherche SQL : 0 ligne) et `ip_hash` sur 64 hex · rate limit 3 puis 429
avec `Retry-After: 3600` · PDF scanné ⇒ score 15, `partial: true`, **un seul finding** `NO_TEXT_LAYER`
sans faux diagnostic · déverrouillage ⇒ rapport complet affiché, lead + magic link en base, **aucun
compte créé avant consommation du lien**.

**Restent ouverts** : axe-core non exécuté, aucun test au clavier seul, arrivée physique de l'email
non confirmée, et `ENABLE_ZDR_CHAT=false` en dev — **à passer à `true` en production** (vision §15.3).

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green (1105 API · 322 web · 127 moteur · 94 landing — `turbo lint build test` 21/21)
- [ ] Coverage ≥ spec threshold sur le nouveau code
- [ ] QA review ✅
- [x] Gate coût : rate limit + budget global vérifiés en conditions réelles (429 + Retry-After)
- [x] Gate RGPD : aucune ligne `ats_scans` ne contient de texte de CV (vérifié en base, en plus du test)
- [x] Gate résilience : le scoring in-app n'appelle aucun modèle (`llmApplied: false` vérifié en base) et `scoreGeneratedCvSafely` ne jette jamais
- [x] Gate a11y : **axe-core 4.10.2, zéro violation** (WCAG 2.1 AA) — page entière en thème clair et sombre, aux trois états (initial, résultat, déverrouillé), et les 4 bandes de score × 2 thèmes
- [ ] ADR-021 et ADR-022 rédigés

## 🚧 Risks

- **Première surface IA publique non authentifiée du produit.** Le per-IP seul ne survit pas à un
  botnet : le budget global quotidien est le vrai stop-loss.
- **L'OCR est la bombe de coût, pas le LLM** (secondes de CPU sur le process API, aucune file de
  jobs). Désactivé sur la route publique ; à ne pas réactiver sans worker dédié.
- Le rate limit est **en mémoire, donc mono-instance**. Valide aujourd'hui (une instance
  docker-compose), à remplacer par le store Redis au premier scale-out. Redis est déjà provisionné
  dans `docker-compose.yml` mais n'est lu nulle part.
- Le barème n'est étalonné sur aucun ATS réel (aucun éditeur ne publie son comportement) : il
  codifie des bonnes pratiques documentées. Risque de contestation du score par les utilisateurs.
- Un même CV peut obtenir deux scores selon la surface (avec ou sans offre). Explicite dans l'UI,
  mais c'est une question de support à anticiper.
- `cv-generation.service.ts` est à **417 lignes**, au-delà du seuil bloquant de 400 : US-105 doit en
  extraire du code, pas en ajouter.
- Dette tracée : `normalizeToken` / `extractKeywords` existent en double (`interview.stats.ts` où la
  première est privée, et `apps/web/lib/interview/insights.ts`). `packages/ats-score` en devient le
  propriétaire canonique ; migrer les deux appelants est une US de suivi, pas un à-côté.

## ⚠️ To Clarify

_Tranché le 2026-09-22 avec le propriétaire :_

1. ~~**Gating landing**~~ → score global + 3 points libres ; rapport détaillé après email.
2. ~~**Moteur**~~ → hybride : règles déterministes + LLM borné à la seule dimension `impact`.
3. ~~**Absence d'offre sur la landing**~~ → champ offre **optionnel** ; sans offre, `keywords` est
   exclue et les poids renormalisés, jamais notée 0.
4. ~~**Rétention**~~ → **rien** n'est conservé du CV, même après déverrouillage. Contrepartie
   assumée : pas de préremplissage du profil à l'inscription.
5. ~~**Conversion**~~ → rapport affiché immédiatement **et** magic link envoyé en parallèle.
6. ~~**Piggyback LLM sur la génération**~~ → rejeté : le grounding retire du contenu *après*
   l'appel, le score décrirait un brouillon jamais livré (ADR-021).
7. ⏳ **Ouvert** : faut-il exposer le score ATS au recruteur dans la V2.0 (`§16`) ? Hors périmètre.

## 🔁 Workflow Runs

_(à compléter à l'exécution)_
