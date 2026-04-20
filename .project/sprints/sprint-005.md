<!-- generated-by: run-agent analyst -->

# Sprint 005

## 🎯 Sprint Goal

Ouvrir le pipeline métier principal du MVP: création de candidature, statuts et intégration OpenRouter conforme RGPD (source: vision `§7`, `§15.2`, `§15.3`, `§16`).

## 📅 Period

- Start: 2026-06-13
- End: 2026-06-27

## ✅ Tasks (3–8 max)

- [x] **[US-017]** Intégrer OpenRouter avec `zdr: true` et fournisseur Mistral
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Tous les appels OpenRouter forcent `zdr: true`
    - [x] Le prompt logging reste désactivé
    - [x] Le provider est limité à Mistral quand applicable
  - Source: vision `§2`, `§15.2`, `§16`
- [ ] **[US-018]** Créer une candidature à partir d'une offre via scraping
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Une offre peut être ingérée depuis une URL
    - [ ] Les champs utiles à la candidature sont extraits
    - [ ] Les erreurs d'extraction sont gérées proprement
  - Source: vision `§7`, `§16`
- [ ] **[US-019]** Ajouter le fallback texte et le fallback PDF si faisable dans le MVP
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le fallback texte est disponible
    - [ ] La faisabilité du fallback PDF MVP est statuée
    - [ ] Si le fallback PDF est trop coûteux, le report est documenté sans casser le MVP
  - Source: vision `§7`, `§16`
- [ ] **[US-020]** Mettre en place le pipeline de statuts candidature
  - Agent: `product-owner`
  - Workflow: `none`
  - Acceptance criteria:
    - [ ] Les statuts du pipeline sont implémentés
    - [ ] Les transitions métier sont définies
    - [ ] Le statut alimente les futurs KPI dashboard
  - Source: vision `§7`, `§12.2`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Le scraping peut varier selon les sites cibles.
- Le fallback PDF ne doit pas retarder le MVP s'il n'est pas soutenable.

## ⚠️ To Clarify (sprint blockers)

- Décision explicite à prendre pendant le sprint sur le fallback PDF MVP.
