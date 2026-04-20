# Stage 2 — Design

## UX Direction

- Reutiliser le shell authentifie existant et ajouter une route dediee `/profile`.
- Garder une experience mobile-first en cartes verticales avec un resume de consultation en tete et les zones d'edition en dessous.
- Seeder le profil depuis l'onboarding quand aucun profil n'existe encore pour eviter une page vide apres `US-013`.

## Interaction Notes

- Consultation: un resume haut de page affiche l'identite, le titre, le nombre de sections renseignees et la date de sauvegarde.
- Edition: chaque section de la vision dispose d'un bloc dedie avec champs libres ou listes repetables.
- Regle MVP: aucun selecteur de profil, aucune action de duplication, aucune suppression.
- Navigation: le wizard d'onboarding peut rediriger vers `/profile`, et le tableau de bord offre aussi l'entree vers ce profil unique.

## Accessibility / Mobile Notes

- Tous les champs restent etiquetes explicitement.
- La mise en page repose sur une colonne principale et des grilles adaptatives simples.
- Les actions principales restent visibles sans table complexe ni interactions dependantes du hover.

## Verdict

- Design coherent avec le scope.
- Aucun risque UX bloquant.
