---
tags: [run/analyze-design-dev-review-20260601110000, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task — Profile CRUD + border-radius rationalization

**Source**: Ad hoc  
**Date**: 2026-06-01  
**Run ID**: analyze-design-dev-review-20260601110000

## Request (verbatim)
Rationaliser la page profil sur l'app `/profile` :
1. CRUD classique avec page de listing, page de création et page d'édition
2. Bords moins arrondis dans la configuration générale du CSS

## Context
- `/profile` est actuellement une seule page monolithique qui contient tout :
  listing des profils, édition inline, import CV, lien RGPD
- `profile-editor.tsx` fait 668 lignes (dépasse le warning threshold TypeScript §9)
- Les profils sont stockés en `localStorage` (côté client uniquement, pas de backend)
- Design tokens actuels : `radius.sm: 0.75rem`, `radius.md: 1rem`, `radius.lg: 1.5rem`, `radius.pill: 999px`
- `design-system.ts` et `styles.tsx` dans `packages/ui/src/` contiennent tous les tokens

## Scope
1. **CRUD profile** : extraire listing → `/profile`, création → `/profile/new`, édition → `/profile/[id]/edit`
2. **Border radius** : réduire les valeurs dans `packages/ui/src/design-system.ts` et `packages/ui/src/styles.tsx`

## Files of interest
- `apps/app/app/profile/page.tsx` (34 lines)
- `apps/app/app/profile/profile-editor.tsx` (668 lines — split required)
- `apps/app/app/profile/cv-import-panel.tsx`
- `packages/ui/src/design-system.ts`
- `packages/ui/src/styles.tsx`
