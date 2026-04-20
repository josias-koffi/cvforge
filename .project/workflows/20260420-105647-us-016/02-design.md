# Stage 2 — Design

## UX / Interaction

- Ajouter une case a cocher obligatoire de consentement sur la page passwordless publique.
- Ajouter la meme garde sur la page d'acceptation d'invitation.
- Afficher un message d'erreur explicite quand le consentement manque au lieu d'un echec silencieux.

## Data Guardrails

- Les champs critiques persistables du MVP doivent etre normalises avant relecture et reutilisation:
  - email valide et normalise,
  - telephone borne et nettoye,
  - URLs `http/https` uniquement,
  - dates ISO valides, avec garde passé/futur selon le champ,
  - bornes de longueur sur les champs texte et listes.

## Accessibility

- Les nouvelles cases a cocher restent associees a un libelle lisible.
- Le retour d'erreur reste textuel et visible dans le flux normal de la page.
