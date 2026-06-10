---
tags: [run/analyze-design-dev-review-20260610150733, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---
# Task

Rationaliser l'application frontend et rendre l'UI/UX plus propre et plus adaptée à un usage principalement desktop.

## Requested outcomes

- Après authentification, arriver sur `/dashboard`.
- Réduire le padding vertical et la sensation d'interface trop vide.
- Retirer la pill `CVforge` redondante dans le menu gauche.
- Améliorer la liste et le détail des candidatures avec Impeccable.
- Raccourcir visuellement les pages CV et lettre de motivation grâce à une mise en page desktop.
- Supprimer ou rediriger uniquement les routes manifestement redondantes, sans casser les liens métier.

## Constraints

- Préserver l'identité `Papier & Crayon` et WCAG 2.1 AA.
- Ne pas modifier `.project/vision.md`.
- Aucun nouveau framework ou package.
- Conserver un comportement mobile utilisable, mais optimiser le poste de travail desktop.
