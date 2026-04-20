# Stage 1 — Analyze

## Scope Confirmation

- `US-014` couvre la modelisation et l'edition du profil de base candidat dans l'application protegee.
- Les sections minimales a exposer viennent directement de la vision `§5.2`:
  - titre professionnel
  - accroche / summary
  - experiences professionnelles
  - formations
  - competences techniques
  - competences humaines
  - certifications
  - projets personnels
  - loisirs / centres d'interet
- Le sprint impose une contrainte MVP supplementaire: un seul profil par compte, sans duplication ni suppression.

## Acceptance Mapping

1. `Le profil de base contient les sections decrites par la vision`
   Evidence attendue: modele explicite + ecran protege couvrant les neuf sections.
2. `Les actions de consultation et edition sont disponibles`
   Evidence attendue: route `/profile`, resume consultable, champs editables et tests associes.
3. `La regle "1 profil de base en MVP" est respectee`
   Evidence attendue: stockage unique, absence de liste multi-profils, metadata `maxProfiles: 1`.

## Product Questions

- Aucun bloqueur supplementaire: la vision autorise plusieurs profils plus tard, mais le sprint borne explicitement ce travail a un profil unique MVP.
- La persistance peut rester locale tant que le futur modele backend n'existe pas encore et que le scope reste exploitable pour la suite du MVP.

## Verdict

- Scope clair.
- Acceptance criteria testables.
