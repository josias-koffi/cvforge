---
tags: [run/analyze-design-dev-review-20260610150733, workflow/analyze-design-dev-review, agent/product-owner, stage/01]
run: "[[workflows/runs/analyze-design-dev-review-20260610150733/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/product-owner/agent]]"
---
# Analyse produit

## Scope

Le besoin prolonge l'epic E15 deja approuvé: corriger le biais mobile-first, densifier le shell et simplifier les surfaces candidatures/documents. La demande donne aussi l'approbation explicite nécessaire pour privilégier le desktop.

## Acceptance criteria

1. La racine authentifiée et la validation réussie du magic link mènent à `/dashboard`.
2. La sidebar desktop n'affiche plus la pill `CVforge`; la marque reste disponible dans le drawer mobile.
3. Le shell réduit ses espacements verticaux et exploite mieux les écrans larges sans dégrader les petits écrans.
4. La page candidatures présente ses KPI et contrôles avec une hiérarchie plus compacte et sans carte englobante inutile.
5. Le détail candidature regroupe statut, actions, offre et documents sans grands vides; les onglets restent accessibles au clavier.
6. Les éditeurs CV et LM utilisent une disposition deux colonnes sur desktop, avec formulaire et aperçu visibles simultanément.
7. Les routes métier ne sont supprimées que si elles sont réellement sans usage; les anciennes entrées utiles sont redirigées.
8. Les tests ciblés, le lint et le build passent.

## Product boundaries

- Pas de nouveau Documents Hub dans ce run: US-067 reste une story distincte.
- Pas de suppression de `/profile`, `/credits`, `/notifications`, `/interview` ou des routes documentaires.
- La route `/` devient une redirection authentifiée, mais l'onboarding existant reste disponible via le profil jusqu'à une décision produit dédiée.

## Verdict

PASS: scope clair, critères testables, aucune question bloquante.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260610150733/task|Task]] · next [[workflows/runs/analyze-design-dev-review-20260610150733/02-design]]
