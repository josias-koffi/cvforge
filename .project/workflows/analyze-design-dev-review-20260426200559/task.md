# Sprint 014 — US-048

- Title: Livrer le mode interview vocal complet avec profils recruteur
- Workflow: `analyze-design-dev-review`
- Source: vision `§10`, `§16`

## Acceptance Criteria

- Le mode interview vocal fonctionne de bout en bout
- Les profils `Standard`, `Agressif`, `Passif`, `Technique`, `Comportemental` existent
- L'utilisateur peut lancer et terminer proprement une session

## Scope Notes

- Keep the existing voice interview loop and make recruiter profiles part of the shared contract.
- Add a clean session-completion path instead of a client-only reset.
- Stay within the current interview slice; post-interview scoring, replay, and free-practice remain out of scope for this task.
