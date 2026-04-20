<!-- generated-by: run-agent analyst -->

# Sprint 009

## 🎯 Sprint Goal

Fermer la boucle de monétisation et d'engagement du MVP avec crédits, Stripe et premier dashboard utilisateur (source: vision `§11`, `§12`, `§16`).

## 📅 Period

- Start: 2026-08-08
- End: 2026-08-22

## ✅ Tasks (3–8 max)

- [ ] **[US-029]** Mettre en place le ledger de crédits et les règles de consommation IA
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le solde de crédits est traçable
    - [ ] Chaque action IA consomme les crédits attendus
    - [ ] L'historique est exploitable pour l'utilisateur et l'admin
  - Source: vision `§11`, `§16`
- [ ] **[US-030]** Intégrer Stripe pour les packs `Starter` et `Pro`
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Les deux packs sont achetables
    - [ ] Le webhook met à jour le solde
    - [ ] Les cas d'erreur de paiement sont gérés
  - Source: vision `§11`, `§16`
- [ ] **[US-031]** Créer la page "Mes crédits" avec historique et alerte solde bas
  - Agent: `designer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le solde courant est visible
    - [ ] L'historique des achats/consommations est lisible
    - [ ] Une alerte apparaît quand le solde est bas
  - Source: vision `§11`, `§14.1`, `§16`
- [ ] **[US-032]** Exposer le dashboard utilisateur avec KPI de base et accès rapides
  - Agent: `analyst`
  - Workflow: `release`
  - Acceptance criteria:
    - [ ] Les 7 KPI de base sont visibles
    - [ ] Les accès rapides et les dernières candidatures sont affichés
    - [ ] Les KPI sont alimentés par les données réelles du produit
  - Source: vision `§12.1` à `§12.4`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- Les règles de débit de crédits doivent rester cohérentes avec les coûts IA réels.
- Stripe et le ledger doivent partager un modèle d'événements fiable.

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur explicite si les packs restent limités à `Starter` et `Pro`.
