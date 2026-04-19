# Task — US-010

- Sprint: `003`
- Task: `US-010`
- Title: `Securiser le bootstrapping du premier admin`
- Workflow: `analyze-design-dev-review`
- Run ID: `20260419-211615-us-010`
- Source: vision `§3.2`, `§16`

## Acceptance Criteria

1. Le premier compte cree recoit le role `admin`.
2. Le mecanisme est desactive definitivement apres creation du premier admin.
3. Une inscription publique ulterieure ne peut jamais creer d'admin.

## Implementation Scope

- Stay inside the existing Nest auth slice.
- Do not add a new framework or database dependency.
- Persist first-admin bootstrap state across restarts.
- Keep public passwordless signup working for non-admin users.

## Validation Plan

- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/api test`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
