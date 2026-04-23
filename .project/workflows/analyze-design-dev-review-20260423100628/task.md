# Task: US-038 — Importer un CV existant avec extraction IA pseudonymisée

- Sprint: `011`
- Workflow: `analyze-design-dev-review`
- Source: vision `§4`, `§15.3`, `§16`

## Acceptance Criteria

- [ ] L'import de CV est disponible
- [ ] Le pipeline d'extraction respecte la pseudonymisation
- [ ] Les limites de qualité sont documentées

## Context

- Les profils de base sont stockés côté app dans le navigateur (`localStorage`).
- L'extraction IA doit donc vivre côté API, puis renvoyer un profil pré-rempli que l'utilisateur valide/corrige avant sauvegarde.
- Le dépôt ne contient actuellement aucun parseur PDF/DOCX ; un ajout de dépendance exige une ADR.
