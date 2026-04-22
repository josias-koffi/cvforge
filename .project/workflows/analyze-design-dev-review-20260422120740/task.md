# Task Context — US-033

- Sprint: `010`
- Task: `US-033` — Développer le panel admin utilisateurs et crédits
- Workflow: `analyze-design-dev-review`
- Source: vision `§13.2`, `§16`

## Acceptance Criteria

1. La liste des utilisateurs est paginée et filtrable
2. Les crédits peuvent être attribués manuellement avec note obligatoire
3. Chaque attribution manuelle est loggée

## Relevant Vision Scope

- Admin route `/admin` réservée au rôle `admin`
- Gestion utilisateurs: tableau paginé avec recherche/filtre
- Attribution manuelle de crédits avec note
- Historique d'activité et crédits visibles côté admin

## Implementation Boundary

- Reuse existing file-backed auth account store and shared credit ledger
- No new framework or persistence layer
- Ship the first usable admin users panel on `/admin`
- Keep template administration on `/admin/templates`
