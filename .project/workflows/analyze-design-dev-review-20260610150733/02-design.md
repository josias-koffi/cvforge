---
tags: [run/analyze-design-dev-review-20260610150733, workflow/analyze-design-dev-review, agent/designer, stage/02]
run: "[[workflows/runs/analyze-design-dev-review-20260610150733/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260610150733/01-analyze]]"
---
# Design

## Direction

Adopter un `bureau de travail calme`, desktop-first dans la composition mais responsive dans l'exécution. La densité augmente par réduction des espacements et suppression des conteneurs redondants, pas par réduction de lisibilité.

## Decisions

- Sidebar desktop plus étroite et sans badge de marque.
- Topbar et header de page plus compacts; largeur de contenu plafonnée pour les écrans 4K.
- KPI candidatures en bande synthétique plutôt qu'en quatre grandes cartes.
- Table candidature directement dans une surface structurée, avec filtres groupés.
- Détail candidature: actions et statut dans le même header, panneau d'onglets compact.
- Editeurs CV/LM: grille desktop `minmax(30rem, 0.9fr) / minmax(42rem, 1.1fr)` et aperçu sticky.
- Historique traité comme information secondaire avec `details`.

## UX risks

- Trop densifier peut nuire au tactile: conserver les cibles mobiles.
- Un aperçu sticky ne doit pas dépasser le viewport; le conteneur doit rester scrollable naturellement.
- Les routes ne doivent pas être supprimées sur la seule base de la navigation actuelle.

## Accessibility

Conserver focus visible, contrastes existants, titres sémantiques et contrôle clavier des tabs. Aucun contenu essentiel uniquement au hover.

## Verdict

PASS: direction conforme au scope, aux personas et aux règles Impeccable.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260610150733/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260610150733/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260610150733/03-implement]]
