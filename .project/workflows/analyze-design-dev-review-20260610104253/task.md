---
tags:
  [
    run/analyze-design-dev-review-20260610104253,
    workflow/analyze-design-dev-review,
  ]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task - Structuration predictive des competences CV

**Run ID**: analyze-design-dev-review-20260610104253
**Type**: Ad hoc
**Date**: 2026-06-10

## Description

Adapter la generation des competences CV pour produire des categories coherentes,
previsibles et compatibles avec le format existant. Le prompt fourni par
l'utilisateur sert de reference fonctionnelle, mais le contrat interne conserve
`skills.categories[].label` au lieu de `category`.

## Acceptance Criteria

- Le prompt deduit les categories du profil global et de l'offre.
- Il demande 3 a 5 categories maximum, 6 items maximum par categorie.
- Une competence ne peut apparaitre que dans une categorie.
- Aucune categorie `Autres` ou `Divers`, aucune competence inventee.
- Les items restent courts et sans formulation de niveau.
- Le serveur accepte les cles IA `label` et `category`, puis normalise vers
  `{ label, items }`.
- Le serveur deduplique globalement et limite a 5 categories / 6 items.
- Le fallback historique `skills.hard` reste supporte.
- Les sauvegardes manuelles conservent les categories.
- Les tests, le lint et le build des packages touches passent.
