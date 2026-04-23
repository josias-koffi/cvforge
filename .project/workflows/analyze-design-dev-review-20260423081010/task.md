# Task Context — US-036

Sprint: `010`
Workflow: `analyze-design-dev-review`
Task: `US-036` — Traiter les exigences RGPD critiques avant lancement commercial

## Acceptance Criteria

1. Export des données personnelles disponible.
2. Suppression compte + données associées opérationnelle.
3. Durées de conservation documentées et purge automatique audio prévue.

## Source

- vision `§15.1`
- vision `§15.5`
- vision `§16`

## Working assumptions

- The authenticated user can trigger their own export and deletion flow.
- The base profile remains browser-local, so the app must merge that local profile into the exported JSON and clear it on deletion.
- Audio retention can be documented and planned before the interview-audio feature exists, as long as the target duration and automation approach are explicit.
