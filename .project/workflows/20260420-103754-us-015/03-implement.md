# Stage 3 — Implement

## Implementation Verdict

Passe.

## Code Changes

- Ajout de `apps/app/app/profile/ai-prompt-profile.ts` pour produire un contrat prompt-safe a partir du profil MVP.
- Le helper:
  - remplace le nom complet par le token `[CANDIDATE]` cote prompt,
  - ne transmet que `firstName` et `city` pour l'identite,
  - exclut explicitement `lastName`, `phone`, `email`, `exactAddress` et `birthDate`,
  - identifie `identity.lastName`, `identity.phone` et `identity.email` comme champs a reinjecter localement.
- Ajout de `apps/app/app/profile/ai-prompt-profile.test.ts` pour figer le comportement et couvrir le contrat vide.

## Quality Gates

- `pnpm --filter @cvforge/app test -- ai-prompt-profile base-profile` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm --filter @cvforge/app build` ✅

## Coverage Impact

- `@cvforge/app` lignes: `92.85%`
- Slice `app/app/profile`: `98.86%`
- Nouveau fichier `ai-prompt-profile.ts`: `100%` lignes / branches / fonctions

## Notes

- Aucun client OpenRouter n'a ete ajoute; le changement reste limite au contrat de pseudonymisation demande par la vision.
