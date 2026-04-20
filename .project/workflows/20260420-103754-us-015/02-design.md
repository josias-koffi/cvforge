# Stage 2 — Design

## Design Verdict

Passe. La story est principalement non-UI; le livrable de design est un contrat de donnees et non une nouvelle interface.

## Proposed Contract

- Ajouter un module de pseudonymisation dedie dans le slice `profile`.
- Exposer un resultat structure contenant:
  - `promptProfile`: donnees autorisees pour les prompts.
  - `localReinjection`: champs locaux a remettre apres generation.
  - `omittedFields`: politique explicite des champs interdits.
- Remplacer le nom de famille par le token `[CANDIDATE]`.
- Conserver seulement la ville dans l'identite prompt-safe.
- Exclure `birthDate` du contexte onboarding derive.

## UX / Accessibility Note

- Aucun impact UI direct.
- Le choix d'un helper pur et teste preserve la reutilisation future dans les flux CV, LM et interview sans multiplier des regles implicites cote interface.

## Delivery Decision

- Le module sera ajoute dans `apps/app/app/profile/ai-prompt-profile.ts`.
- Les tests couvriront a la fois le cas nominal et le contrat vide afin de figer la structure attendue avant l'arrivee des integrations OpenRouter.
