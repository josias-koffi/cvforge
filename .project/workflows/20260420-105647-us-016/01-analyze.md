# Stage 1 — Analyze

## Scope Decision

`US-016` reste limite a trois livrables lies au MVP:

1. collecter un consentement explicite sur les parcours d'inscription existants,
2. poser des garde-fous sur les entrees critiques deja manipulees par le front et l'auth,
3. documenter les ecarts RGPD qui restent hors perimetre court terme dans le sprint `009`.

## Workflow Note

Le sprint declare `bug-triage`, mais ce workflow ne permet pas d'implementer ni de verifier les criteres d'acceptation. Par coherence avec le precedent `US-012`, la story est executee ici avec l'override `analyze-design-dev-review`.

## Acceptance Mapping

- Consentement a l'inscription: checkbox obligatoire sur les deux parcours d'inscription et enforcement cote serveur.
- Validations critiques: email/consent cote auth, puis normalisation stricte des URL, telephone, dates et champs texte dans les slices onboarding/profil.
- Documentation sprint 009: reporter explicitement les gaps juridiques et operationnels restants vers `US-036`.

## Open Questions

- Aucun bloqueur produit supplementaire.
- Les CGU et la politique de confidentialite restent des livrables de sprint `009`, pas un ajout fonctionnel de sprint `004`.
