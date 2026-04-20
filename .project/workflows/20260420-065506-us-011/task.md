# Task Context — US-011

- Sprint: `003`
- Task: `US-011`
- Title: `Ajouter les invitations admin/user à usage unique avec expiration 48h`
- Workflow: `analyze-design-dev-review`
- Source references:
  - `.project/sprints/sprint-003.md`
  - `.project/vision.md §3.2`
  - `.project/vision.md §13.2`
- Acceptance criteria:
  - Un admin peut generer un lien d'invitation nominatif.
  - Le lien n'est consommable qu'une seule fois.
  - Le lien expire apres 48h.

## Initial Notes

- Existing auth is passwordless and file-backed in `apps/api/src/auth/`.
- First-admin bootstrap is already implemented and must remain the only non-invitation path to the `admin` role after bootstrap.
- There is no admin panel yet, so this task should add the invitation capability without inventing unrelated admin-management features.
