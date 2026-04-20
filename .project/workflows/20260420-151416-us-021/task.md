# Task Context — US-021

- Sprint: `006`
- Task: `US-021`
- Title: `Développer les blocs Puck custom CV et LM`
- Workflow: `analyze-design-dev-review`
- Run ID: `20260420-151416-us-021`

## Acceptance Criteria

1. Les blocs CV et LM décrits par la vision existent.
2. Les props attendues sont implémentées.
3. Les blocs sont réutilisables dans les templates admin et user.

## Vision Scope

- `§6.1` à `§6.4`: architecture Puck, pipeline JSON normalisé, liste des blocs CV/LM et props.
- `§13.3`: la gestion admin des templates arrive au sprint suivant, donc cette story prépare les briques réutilisables sans imposer l'éditeur complet.
- `§16`: les blocs Puck custom sont un item MVP distinct du système de templates admin.

## Initial Product Interpretation

- Cette story doit livrer le contrat de contenu et la bibliothèque de blocs métier.
- L'intégration complète de l'éditeur Puck admin relève de `US-022`.
- Les mêmes définitions de blocs doivent pouvoir alimenter plus tard le mode admin et le rendu user.
