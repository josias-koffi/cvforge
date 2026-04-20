# Task Context — US-016

- Sprint: `004`
- Task: `US-016`
- Title: `Ajouter consentement et garde-fous de donnees necessaires au MVP`
- Workflow: `analyze-design-dev-review` (override)
- Declared sprint workflow: `bug-triage`
- Source: vision `§15.1`, `§15.5`

## Acceptance Criteria

1. Le consentement utilisateur est collecte a l'inscription.
2. Les validations d'entrees critiques sont en place.
3. Les ecarts RGPD ouverts sont documentes pour le sprint 009.

## Relevant Vision Rules

- Le consentement doit etre collecte a l'inscription via une checkbox liee aux CGU et a la politique de confidentialite.
- Les obligations RGPD encore ouvertes avant lancement doivent etre tracees explicitement.
- Le MVP doit garder un perimetre de minimisation de donnees et de garde-fous avant l'integration IA.

## Current Code Context

- L'entree publique actuelle passe par le formulaire passwordless `apps/app/app/login/page.tsx`.
- Le parcours d'inscription invitee passe par `apps/app/app/register/invitation/page.tsx`.
- Les donnees onboarding et profil sont stockees localement dans `apps/app/app/onboarding/draft.ts` et `apps/app/app/profile/base-profile.ts`.

## Delivery Boundary

- Ajouter la collecte et l'application du consentement sur les parcours d'inscription publics et invites.
- Renforcer les garde-fous sur les entrees critiques deja presentes dans le MVP sans inventer une politique RGPD hors vision.
- Reporter les ecarts RGPD encore ouverts vers le sprint `009`.
