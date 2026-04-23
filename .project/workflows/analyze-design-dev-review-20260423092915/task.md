# Task Context — US-037

- Sprint: `011`
- Task: `US-037` — Ajouter les profils de base multiples
- Workflow: `analyze-design-dev-review`
- Agent owner: `developer`

## Acceptance Criteria

- Un utilisateur peut gerer plusieurs profils de base
- Le profil actif peut etre selectionne par candidature
- La compatibilite avec CV/LM existants est maintenue

## Scope Notes

- Vision refs: `§5.1`, `§16`
- Current app stored one local base profile in browser storage
- CV and LM generation already consume that local profile client-side
- Existing user data must migrate without losing the historical single-profile state
