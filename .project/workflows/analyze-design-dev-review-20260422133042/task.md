# Task Context — US-035

- Sprint: `010`
- Task: `US-035` — Mettre en place le centre de notifications et les rappels de base
- Workflow: `analyze-design-dev-review`
- Source: vision `§12.4`, `§14`, `§16`

## Acceptance Criteria

- La cloche avec badge est présente dans le header
- Les notifications in-app sont listées avec statut lu/non lu
- Les rappels de candidature (J+7) sont déclenchés

## Scope Notes

- MVP reminder scope stays limited to the vision's `Relance candidature` rule: J+7 après envoi sans réponse.
- Delivery should stay inside the current monorepo architecture: Next.js app, NestJS API, file-backed stores already used by existing slices.
- No email preferences UI is required for this story.
