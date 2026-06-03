---
tags: [run/analyze-design-dev-review-20260603081446, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---
# Task

Ad hoc request:

> on a ajouter des modification sur la vue des formation, on a ajouter une description a la formation, mais on ne l'a pas ecrit au niveau de l'edition du profil, en effet l'utilisateur quand il edit ses formation, il doit pouvoir ecrire cette descripion qui seras reprise et améliorer au besoins pour matcher avec l'offre, rajoute ça

## Acceptance Criteria
- Profile education editing exposes a description field for each education entry.
- The description is persisted in the base profile registry and sanitized like other long text fields.
- CV generation can reuse this education description through `promptProfile.profileSections.education`.
- Existing profile editor tests cover the field render and persistence path.
