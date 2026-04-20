# Task Context — US-020

- Sprint: `005`
- Task ID: `US-020`
- Title: `Mettre en place le pipeline de statuts candidature`
- Workflow: `analyze-design-dev-review` (override)
- Run ID: `20260420-143133-us-020`
- Source: [.project/sprints/sprint-005.md](/home/devops/perso/projets/cvforge/.project/sprints/sprint-005.md)

## Acceptance Criteria

1. Les statuts du pipeline sont implémentés.
2. Les transitions métier sont définies.
3. Le statut alimente les futurs KPI dashboard.

## Vision Anchors

- `.project/vision.md` §7.2:
  `Brouillon → Envoyée → Entretien planifié → Refus → Offre reçue`
- `.project/vision.md` §7.2:
  transitions manuelles par l'utilisateur, changements horodatés et historisés
- `.project/vision.md` §12.2:
  `Total candidatures`, `Candidatures par statut`, `Taux de réponse`

## Initial Scope Decision

- In scope:
  type-safe status model, persisted status history, explicit transition rules,
  user-facing status update controls on `/candidatures`, and KPI-ready summary
  data exposed to the dashboard.
- Out of scope:
  full candidature detail sheet, tags, reminders, ATS score, and chart widgets.
