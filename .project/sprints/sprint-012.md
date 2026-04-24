<!-- generated-by: run-agent analyst -->

# Sprint 012

## 🎯 Sprint Goal

Compléter `V1.1` avec les rappels multicanaux, les analytics avancées et la mécanique de partage social (source: vision `§12.3` à `§12.5`, `§14`, `§16`).

## 📅 Period

- Start: 2026-09-19
- End: 2026-10-03

## ✅ Tasks (3–8 max)

- [x] **[US-041]** Envoyer les rappels et notifications email avec préférences utilisateur
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Les notifications email essentielles sont envoyées
    - [x] Les préférences utilisateur sont configurables
    - [x] Le provider email choisi est intégré
  - Source: vision `§14`, `§16`
- [x] **[US-042]** Exposer les graphiques avancés du dashboard
  - Agent: `analyst`
  - Workflow: `release`
  - Acceptance criteria:
    - [x] L'évolution des candidatures, les statuts, la progression ATS et les scores post-interview sont visibles
    - [x] Les graphiques utilisent les données réelles
    - [x] Les indicateurs restent lisibles sur mobile et desktop
  - Source: vision `§12.3`, `§16`
- [ ] **[US-043]** Générer la carte partageable LinkedIn et le partage natif
  - Agent: `designer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Une carte visuelle partageable est générée
    - [ ] Le lien de partage LinkedIn natif fonctionne
    - [ ] Le rendu reste cohérent avec l'identité produit
  - Source: vision `§12.5`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Le provider email doit être arrêté avant implémentation.
- Les graphiques avancés dépendent de la qualité des données accumulées sur le MVP.

## ⚠️ To Clarify (sprint blockers)

- Choisir définitivement le provider email avant démarrage du sprint.
