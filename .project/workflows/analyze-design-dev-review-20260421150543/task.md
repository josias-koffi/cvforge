# US-030 — Integrer Stripe pour les packs Starter et Pro

- Sprint: `009`
- Task: `US-030`
- Workflow: `analyze-design-dev-review`
- Agent owner: `developer`

## Acceptance criteria

- Les deux packs sont achetables
- Le webhook met a jour le solde
- Les cas d'erreur de paiement sont geres

## Source context

- Vision `§11.5 Packs disponibles`
- Vision `§11.6 Paiement`
- Vision `§11.7 Historique & transparence`
- Vision `§14.1 Notifications automatiques`

## Implementation notes

- Reuse the append-only credits ledger introduced by `US-029`.
- Do not create a second balance source outside `CreditsService`.
- Keep the first purchase entry point small; the full "Mes credits" page remains in `US-031`.
