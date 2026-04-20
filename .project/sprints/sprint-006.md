<!-- generated-by: run-agent analyst -->

# Sprint 006

## 🎯 Sprint Goal

Livrer la fondation documentaire du produit avec les blocs Puck et la gestion admin des templates CV/LM (source: vision `§6`, `§13.3`, `§16`).

## 📅 Period

- Start: 2026-06-27
- End: 2026-07-11

## ✅ Tasks (3–8 max)

- [x] **[US-021]** Développer les blocs Puck custom CV et LM
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Les blocs CV et LM décrits par la vision existent
    - [x] Les props attendues sont implémentées
    - [x] Les blocs sont réutilisables dans les templates admin et user
  - Source: vision `§6.1` à `§6.4`, `§16`
- [x] **[US-022]** Créer la gestion admin des templates CV ATS et LM ATS
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Au moins un template CV ATS et un template LM ATS sont gérables
    - [x] L'admin peut créer et modifier un template dans Puck
    - [x] Les templates sont stockés selon l'architecture décrite
  - Source: vision `§6.5` à `§6.7`, `§13.3`, `§16`
- [ ] **[US-023]** Gérer activation, duplication, catégorisation et défaut des templates
  - Agent: `product-owner`
  - Workflow: `none`
  - Acceptance criteria:
    - [ ] Un template peut être dupliqué
    - [ ] Les tags/catégories sont gérés
    - [ ] Un template par défaut est définissable par type
  - Source: vision `§6.6`, `§13.3`, `§16`
- [ ] **[US-024]** Prévisualiser les templates avec données fictives injectées
  - Agent: `designer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Une prévisualisation live existe
    - [ ] Les données fictives couvrent les cas principaux
    - [ ] Le rendu respecte le design "Papier & Crayon"
  - Source: vision `§13.3`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Le schéma de contenu normalisé doit rester stable pour ne pas casser les futures générations.
- Les templates admin doivent rester compatibles avec l'édition utilisateur.

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur explicite au-delà des choix de taxonomie de templates.
