# Stage 3 — Implement

Agent: `developer`

## Code Changes

- Ajout du contrat de contenu document dans `packages/types/src/index.ts`:
  - types `CVDocumentContent` et `LetterDocumentContent`
  - props typées pour chaque bloc CV/LM
  - constantes de type de template et de style partagé
- Ajout de la bibliothèque de blocs dans `packages/ui/src/document-blocks.tsx`:
  - implémentations React pour tous les blocs listés en vision `§6.3`
  - registre partagé `documentBlockRegistry`
  - helper `getBlocksForTemplateKind` pour réutilisation admin/user
- Export des nouveaux blocs depuis `packages/ui/src/index.tsx`
- Ajout des tests de contrat et de rendu dans `packages/types/src/index.test.ts` et `packages/ui/src/index.test.tsx`
- Ajout d'une note de design persistée dans `.project/designs/US-021.md`

## Quality Gates

- `pnpm --filter @cvforge/types lint` ✅
- `pnpm --filter @cvforge/types test` ✅
- `pnpm --filter @cvforge/types build` ✅
- `pnpm --filter @cvforge/ui lint` ✅
- `pnpm --filter @cvforge/ui test` ✅
- `pnpm --filter @cvforge/ui build` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ✅

## Coverage Impact

- `@cvforge/types`: 100% lines / 100% branches / 100% functions
- `@cvforge/ui`: 100% lines / 96% branches / 100% functions
- Le nouveau module `document-blocks.tsx` est couvert à 100% lignes et branches.

## Notes

- Aucune nouvelle dépendance tierce n'a été introduite.
- L'intégration de la vraie UI Puck reste volontairement pour `US-022`.
