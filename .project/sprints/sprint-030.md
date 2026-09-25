<!-- generated-by: plan « Outils gratuits d'acquisition » (demande propriétaire 2026-09-24) — brouillon -->

# Sprint 030 — Métier, employeur, entretien : trois outils gratuits et leurs pages SEO

## 🎯 Sprint Goal

Épic **E23 — Outils gratuits d'acquisition**. Transformer les données déjà collectées (radar
marché, ROME, fiches entreprises) en outils sans compte et en pages indexables, et ajouter un
outil d'entretien qui mène vers l'entretien vocal.

> ⚠️ Absent de `.project/vision.md`. Décision produit du 2026-09-24. À reporter par le Product
> Owner, jamais en auto-édition.

> ⚠️ **Brouillon.** Dépend du sprint 029 (mesure, rate limit, service lead). Période à fixer.

## ✅ Tasks

- [x] **[US-137]** « Ce métier recrute-t-il près de chez moi ? »
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Autocomplete ROME public, lu dans la copie locale (`rome-appellations.pg-reader.ts`).
    - [x] Pour un métier et un département : tension 1 à 5, volume d'offres, demandeurs
          (`market-stats.service.ts`), salaire médian avec taille d'échantillon.
    - [x] 0 appel France Travail à la requête ; source France Travail citée (ADR-024).
    - [x] Salaire masqué sous une taille d'échantillon minimale, avec message explicite.
    - [x] CTA « Recevoir chaque matin les offres de ce métier » → service lead ; après
          inscription, le projet de recherche est pré-rempli (ROME + lieu) et le digest E19 part.
  - Découpage obligatoire (story `L`) : API d'abord, page ensuite.
- [x] **[US-138]** Pages SEO métier × département
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Pages ISR générées depuis les données locales, sitemap, JSON-LD, canonical et hreflang.
    - [x] Pas de page sans données.
  - Décidé le 2026-09-24 : les couples qui ont des données (tension et offres sur 12 mois), donc ceux que la demande a fait lire ; plafond de 20 000.
- [x] **[US-139]** « Vérifier un employeur »
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Recherche par nom ou SIREN ; fiche : effectif, NAF, Egapro, ESS, société à mission,
          bilan carbone, page employeur France Travail (`companies/`).
    - [x] Fonctionne sans clé API ; sources citées.
    - [x] Entreprise inconnue : message clair, pas d'erreur.
    - [x] CTA vers les entreprises qui recrutent (E20) → service lead.
  - Quotas vérifiés le 2026-09-24 : 7 appels/s documentés, 429 vu à 5/s ; l'outil a son propre limiteur à 2/s (ADR-022, amendement sexies).
- [x] **[US-140]** Pages SEO entreprises
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Pages ISR avec sources citées, sitemap, canonical et hreflang.
    - [x] Seules les entreprises déjà en base sont générées.
  - Décidé le 2026-09-24 : entreprises publiables (ni entrepreneur individuel ni diffusion partielle), ouvertes, avec au moins un fait au-delà du NAF ; plafond de 4 500 (ADR-022, amendement septies).
- [x] **[US-141]** Questions d'entretien probables
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Pour un texte d'offre : 5 questions, un appel LLM court via `OpenRouterService`, prompt
          dérivé de `interview.prompts.ts`, sortie en schéma JSON strict.
    - [x] Budget global quotidien et limite par IP (US-132) ; budget épuisé ⇒ 503 avec
          `Retry-After`.
    - [x] Panne OpenRouter ⇒ message propre, jamais une 500.
    - [x] CTA « S'entraîner à l'oral avec un recruteur IA » → service lead.
  - Vérifié le 2026-09-25 : 3/h et 10/j par IP, 300/j global (ADR-022, amendement octies) ; 429 et 503 + `Retry-After` vus sur l'API lancée.

- Hors sprint, 2026-09-25, à la demande du propriétaire : panneau d'offre de `/offres` et
  `/offres-du-jour` enrichi (profil, avantages, contact, site de l'entreprise, lien direct
  « Postuler sur … », source toujours citée), texte en pleine largeur, ouverture sans requête
  serveur. Livré sans US ni workflow.

Critères communs aux outils : voir `backlog.md`, « Critères d'acceptation détaillés — E23 ».

## 📊 Sprint DoD

- [x] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] QA review
- [x] Gate coût : budget global et limite par IP vérifiés sur la route LLM d'US-141 avant mise en
      ligne

## 🔁 Workflow Runs
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924211657|analyze-design-dev-review]] (US-137) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924215644|analyze-design-dev-review]] (US-138) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924222645|analyze-design-dev-review]] (US-139) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924232418|analyze-design-dev-review]] (US-140) — passed
- 2026-09-25 — [[workflows/runs/analyze-design-dev-review-20260925000215|analyze-design-dev-review]] (US-141) — passed
