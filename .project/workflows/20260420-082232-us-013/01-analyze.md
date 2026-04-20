# Stage 1 — Analyze

## Scope Confirmation

- `US-013` reste limite au wizard d'onboarding candidat visible apres authentification.
- Les 5 etapes attendues proviennent directement de la vision:
  - informations personnelles
  - liens externes
  - informations complementaires
  - import de CV existant (optionnel)
  - recapitulatif & validation
- Le profil de base complet et ses editions restent hors perimetre jusqu'a `US-014`.

## Acceptance Mapping

1. `5 etapes presentes`
   Evidence attendue: structure de wizard avec les cinq titres de section.
2. `Recapitulatif final + reprise`
   Evidence attendue: resume final, boutons de retour vers les etapes, brouillon persistable.
3. `Utilisable en mobile-first`
   Evidence attendue: layout en colonne, navigation et actions empilees, champs pleine largeur.

## Product Questions

- Aucun bloqueur supplementaire dans la vision.
- L'import IA du CV reste explicitement limite au rattachement de fichier et a la preparation du profil MVP, sans promettre l'extraction complete dans cette story.

## Verdict

- Scope clair.
- Acceptance criteria testables.
