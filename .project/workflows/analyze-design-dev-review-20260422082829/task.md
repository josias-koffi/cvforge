# Task Context — US-031

- Sprint: `009`
- Task: `US-031`
- Title: `Créer la page "Mes crédits" avec historique et alerte solde bas`
- Workflow: `analyze-design-dev-review`
- Agent owner: `designer`

## Acceptance Criteria

1. Le solde courant est visible
2. L'historique des achats/consommations est lisible
3. Une alerte apparaît quand le solde est bas

## Vision Sources

- `.project/vision.md` `§11.7`
- `.project/vision.md` `§14.1`
- `.project/vision.md` `§16`

## Implementation Scope

- Reuse the existing authenticated credits ledger endpoint (`GET /credits/me`)
- Add the missing user-facing credits page in the Next app
- Keep Stripe checkout entry points accessible from both dashboard and credits page
- Surface low-balance warning from the ledger summary threshold instead of duplicating rules
