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
- [ ] **[US-138]** Pages SEO métier × département
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Pages ISR générées depuis les données locales, sitemap, JSON-LD, canonical et hreflang.
    - [ ] Pas de page sans données.
  - À décider : le volume de pages indexées au lancement (tous les couples ou les plus demandés).
- [ ] **[US-139]** « Vérifier un employeur »
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Recherche par nom ou SIREN ; fiche : effectif, NAF, Egapro, ESS, société à mission,
          bilan carbone, page employeur France Travail (`companies/`).
    - [ ] Fonctionne sans clé API ; sources citées.
    - [ ] Entreprise inconnue : message clair, pas d'erreur.
    - [ ] CTA vers les entreprises qui recrutent (E20) → service lead.
  - À vérifier : les quotas de recherche-entreprises.api.gouv.fr pour un appel à la demande.
- [ ] **[US-140]** Pages SEO entreprises
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Pages ISR avec sources citées, sitemap, canonical et hreflang.
    - [ ] Seules les entreprises déjà en base sont générées.
- [ ] **[US-141]** Questions d'entretien probables
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Pour un texte d'offre : 5 questions, un appel LLM court via `OpenRouterService`, prompt
          dérivé de `interview.prompts.ts`, sortie en schéma JSON strict.
    - [ ] Budget global quotidien et limite par IP (US-132) ; budget épuisé ⇒ 503 avec
          `Retry-After`.
    - [ ] Panne OpenRouter ⇒ message propre, jamais une 500.
    - [ ] CTA « S'entraîner à l'oral avec un recruteur IA » → service lead.

Critères communs aux outils : voir `backlog.md`, « Critères d'acceptation détaillés — E23 ».

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] QA review
- [ ] Gate coût : budget global et limite par IP vérifiés sur la route LLM d'US-141 avant mise en
      ligne

## 🔁 Workflow Runs
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924211657|analyze-design-dev-review]] (US-137) — passed
