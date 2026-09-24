<!-- generated-by: plan « API France Travail » (demande propriétaire 2026-09-23) — brouillon -->

# Sprint 027 — Chercher par métier, expliquer chaque offre

## 🎯 Sprint Goal

Épic **E21 — Matching ROME et radar marché**. Les codes ROME confirmés au sprint 026 (US-118)
servent enfin à la collecte et au score. Le candidat reçoit les offres de son **métier** et plus
seulement de ses mots-clés. Chaque offre lui dit ce qu'il a déjà et ce qu'il doit mettre en avant, et
« Ma recherche » lui dit si sa recherche est réaliste.

> ⚠️ Absent de `.project/vision.md`, comme E19 et E20. À reporter par le Product Owner, jamais en
> auto-édition (hard rule).

> ⚠️ **Brouillon.** Dépend entièrement de US-122, US-123 et US-118 (sprint 026). Période à fixer à
> l'ouverture.

## 📅 Period

- Start: à fixer
- End: à fixer

## ✅ Tasks

- [x] **[US-124]** Collecte par métier : Offres v2 et La bonne alternance interrogées par ROME
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] `buildSourceQueries` groupe les requêtes par (appellation ou code ROME confirmé) × (commune
          avec rayon, ou département). Une requête reste partagée entre candidats.
    - [x] Repli sur `motsCles` quand un projet n'a aucune appellation confirmée : jamais moins
          d'offres qu'aujourd'hui.
    - [x] La bonne alternance est interrogée par `romes` et non plus seulement par département. Le
          cache de dix minutes est indexé sur la nouvelle requête.
    - [x] Le mapper Offres stocke `romeCode`, `appellationCode`, `competences[]` et `siret` quand ils
          sont présents. Migration `0030` sur `job_listings` et `jobs`.
  - À vérifier en direct : taux d'offres Offres v2 qui portent des compétences ROME et un SIRET, et
    format exact du champ compétences.
  - **Livré le 2026-09-24** ([[workflows/runs/developer-20260924080225]]). Ce que la mesure a changé au plan :
    - la recherche par ROME **s'ajoute** aux mots-clés, elle ne les remplace jamais. Sur sept
      jours, « Ingénieur logiciel » (44) donne 8 offres par mots-clés et 16 de plus par ROME ;
      « Commercial » (31) en donne 108 par mots-clés et 10 par ROME. Seule l'union ne perd
      rien ;
    - regroupement par département et non par commune et rayon, comme les mots-clés : plus
      large et mieux partagé ;
    - vérifié en direct : 100 % des offres France Travail portent `romeCode` et le libellé
      d'appellation, 30 % leurs compétences (423 sur 1 431), 0 % un SIRET (ni en recherche,
      ni sur le détail) et 0 % un code d'appellation. Donc pas de colonne SIRET, et le libellé
      à la place du code. Migration **0031**, la 0030 étant prise par une autre session.

- [x] **[US-125]** Compétences du candidat, déduites du CV
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] ROMEO `predictionCompetences` est appelé sur les sections du CV. Il n'est rappelé que si
          l'empreinte du texte a changé.
    - [x] Stockage dans `profile_rome_competences`, table annexe sans clé étrangère, couverte par la
          purge RGPD.
    - [x] Le candidat peut retirer une compétence déduite. Elle n'est alors plus jamais reproposée
          pour ce texte.
  - **Livré le 2026-09-24** ([[workflows/runs/developer-20260924085500]]) :
    - lu à l'enregistrement du profil : compétences, lignes de résultats, projets et certifications
      (résumé et diplômes exclus, trop génériques en direct) ;
    - les codes ROMEO sont ceux des offres et du référentiel local, donc US-126 peut croiser par code ;
    - bruit mesuré : « Docker » lu « Doctorat » à 0,83. Aucun seuil ne le filtre, d'où le retrait
      par le candidat, définitif pour le profil ;
    - migration **0032** (`profile_rome_competences` et `profile_rome_inferences`) ; carte « Vos
      compétences » sur `/ma-recherche`.

- [x] **[US-126]** Score par compétences ROME et « pourquoi cette offre »
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] `matching/rome-matching.ts`, extrait de `job-matching.ts` pour respecter la limite de
          taille (§9) :
      - titre : 1 si le code ROME est identique, 0,6 pour le même grand domaine, sinon le score
        actuel par sous-chaîne ;
      - compétences : recouvrement entre les compétences de l'offre (à défaut, celles du métier ROME
        de l'offre) et celles du profil ;
      - le barème reste sur 100.
    - [x] `job_matches.missing_skills` rejoint `matched_skills` : les compétences exigées d'abord.
    - [x] Tests sur des fixtures où ROME et mots-clés divergent, par exemple « Ingénieur logiciel »
          face à une recherche de « Développeur full stack ».
  - **Livré le 2026-09-24** ([[workflows/runs/developer-20260924100500]]) :
    - 0,6 pour le même **domaine** (M18) et non le même grand domaine : la lettre M regroupe
      comptabilité, RH et informatique ;
    - un CV lu par ROMEO tombe rarement sur le code exact d'une fiche (3 sur 21 mesurés). Une
      compétence compte donc aussi quand les libellés partagent deux mots significatifs, et les
      compétences génériques (plus de 100 métiers) sont ignorées ;
    - le score garde le meilleur des mots-clés et du ROME : sur 1 948 offres locales, 1 108
      relevées, aucune baissée ;
    - `missing_skills` (migration **0033**) ne vient que des compétences propres de l'offre, pas de
      la fiche métier, trop longue pour « À mettre en avant ».

- [ ] **[US-127]** La carte d'offre explique, et le CV en tient compte
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `offer-card` et `offer-sheet` : « Vous avez » et « À mettre en avant », avec les
          compétences ROME. Source France Travail citée.
    - [ ] « Postuler avec CVForge » transmet `missingSkills` à la génération de CV, comme **pistes
          à valoriser si le candidat les possède**, jamais comme expérience à inventer. Le prompt le
          dit explicitement, et un test le vérifie.
- [ ] **[US-128]** Radar marché sur « Ma recherche » et dans le digest
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] API Marché du travail : tension, volume d'offres, demandeurs et salaires par code ROME et
          territoire. Table `market_stats` (migration `0031`), rafraîchie une fois par mois, jamais
          à l'affichage.
    - [ ] Encart sur `/ma-recherche` : « Métier en tension dans votre département », « Salaire
          médian observé », et le département voisin le plus porteur.
    - [ ] Une ligne dans l'e-mail du matin quand un indicateur change de manière notable.
    - [ ] Aucune donnée affichée sans sa période et sa source.
  - À vérifier en direct : indicateurs réellement servis, granularité territoriale (département,
    bassin d'emploi, région), fraîcheur, et licence.

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] QA review
- [ ] Gate : `ft:smoke` a tourné pour ROMEO, ROME 4.0 et Marché du travail
- [ ] Gate : repli mots-clés testé (aucun projet sans ROME ne perd d'offres)

## 🚧 Risks

- Qualité de ROMEO sur les intitulés courts : inconnue, à mesurer sur un échantillon réel.
- Part des offres Offres v2 sans compétences : le repli sur le métier ROME rend le score moins fin.
- Les salaires de Marché du travail sont des agrégats : les afficher comme des repères, jamais comme
  une promesse.

## 🔁 Workflow Runs

- 2026-09-24 — [[workflows/runs/developer-20260924080225|developer]] (US-124) — passed
- 2026-09-24 — [[workflows/runs/developer-20260924085500|developer]] (US-125) — passed
- 2026-09-24 — [[workflows/runs/developer-20260924100500|developer]] (US-126) — passed
