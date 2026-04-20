# Stage 3 — Implement

## Code Changes

- Ajout d'un nouveau slice `apps/app/app/profile/` avec:
  - `base-profile.ts` pour le modele, la sanitization, le seed depuis l'onboarding et la persistance locale unique
  - `profile-editor.tsx` pour l'edition des neuf sections de la vision
  - `page.tsx` pour la route protegee `/profile`
  - tests dedies sur le modele et la page
- Mise a jour de la navigation applicative pour exposer `Profil de base`.
- Mise a jour du wizard d'onboarding pour rediriger vers `/profile` a la validation et offrir un lien direct vers le profil.
- Mise a jour du tableau de bord pour presenter le profil unique MVP et donner acces a `/profile`.

## Quality Gates

- `pnpm --filter @cvforge/app test` ✅
  - couverture `@cvforge/app`: `92.53%` lignes / `89.39%` branches
  - couverture `app/app/profile`: `98.67%` lignes / `93.58%` branches
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ⚠️ bloque par des artefacts `.next` pre-existants avec permissions invalides dans `apps/landing` puis `apps/app`

## Coverage Impact

- Le nouveau slice `profile` depasse les seuils bloquants du spec pour le code touche.
- Le composant d'edition statique suit le meme pattern que l'onboarding: logique testee dans les helpers, markup couvert par les tests de page.

## Blocking Issues

- Aucun blocage produit ou technique sur `US-014`.
- Advisory environnemental seulement sur les repertoires `.next` detenus par un autre utilisateur.
