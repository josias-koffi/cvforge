# Stage 3 — Implement

## Code Changes

- Remplacement de la page protegee `/` par un wizard d'onboarding en 5 etapes via `apps/app/app/onboarding/wizard.tsx`.
- Ajout d'un stockage local de brouillon et d'utilitaires testes dans:
  - `apps/app/app/onboarding/draft.ts`
  - `apps/app/app/onboarding/wizard-state.ts`
- Ajout d'une route protegee `/dashboard` pour la sortie post-validation.
- Mise a jour de la navigation applicative pour distinguer onboarding et tableau de bord.
- Mise a jour des tests serveur existants et ajout de tests unitaires sur l'etat du wizard.

## Quality Gates

- `pnpm --filter @cvforge/app test` ✅
  - couverture `@cvforge/app`: `90.21%` lignes / `70.08%` branches
  - couverture du dossier onboarding: `92.03%` lignes
- `pnpm test` ✅
- `pnpm lint` ✅
- `pnpm build` ⚠️ bloque par un probleme pre-existant de permissions sur `apps/landing/.next/trace`

## Coverage Impact

- Le nouveau slice onboarding depasse le seuil de lignes attendu pour le code touche.
- Le rendu UI statique du wizard reste verifie via les tests de page, tandis que l'etat du wizard est couvert par des tests unitaires dedies.

## Blocking Issues

- Aucun blocage produit ou technique sur le scope `US-013`.
- Advisory environnemental seulement sur le build Next du package `landing`.
