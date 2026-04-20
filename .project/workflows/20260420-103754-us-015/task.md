# Task Context — US-015

- Sprint: `004`
- Task: `US-015`
- Title: `Appliquer les regles de pseudonymisation pour les prompts IA`
- Workflow: `analyze-design-dev-review`
- Source: vision `§15.3`, `§16`

## Acceptance Criteria

1. Les donnees interdites ne sont pas transmises a l'IA.
2. Les champs a reinjecter localement sont identifies.
3. Le comportement est couvert par des tests.

## Relevant Vision Rules

- Les appels IA ne doivent jamais recevoir le nom de famille, le telephone, l'adresse exacte, la date de naissance, ni l'email personnel.
- Le prenom peut etre transmis.
- L'adresse complete doit etre reduite a la ville uniquement.
- Le nom de famille doit etre remplace par le token `[CANDIDATE]`.
- Le telephone et l'email doivent etre reinjectes localement apres generation.

## Current Code Context

- Aucun client OpenRouter n'existe encore dans le depot.
- Le profil MVP est stocke localement dans `apps/app/app/profile/base-profile.ts`.
- Les donnees d'onboarding complementaires sont stockees dans `apps/app/app/onboarding/draft.ts`.

## Delivery Boundary

- Etablir un contrat de pseudonymisation reutilisable dans la couche `apps/app`.
- Ne pas inventer une integration OpenRouter ou un schema de document final qui n'existe pas encore.
